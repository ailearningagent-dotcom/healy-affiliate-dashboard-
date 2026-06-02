/**
 * 360 Follow-up Engine — Multi-Channel Autonomous Follow-up Dispatcher
 *
 * Orchestrates follow-ups across email, WhatsApp, phone, SMS, and LinkedIn.
 * Intelligently selects the best channel based on lead preferences and history.
 * Auto-advances nurture sequences and sends actual messages.
 *
 * Cost Architecture:
 *   - Email: $0 (Gmail SMTP, 500/day free)
 *   - WhatsApp: $0 (WhatsApp Web browser automation)
 *   - SMS/Phone/LinkedIn: Tracked but not auto-sent (manual or future)
 *   - Nurture templates: $0 (default templates, no LLM call)
 *   - LLM personalization: ~$0.0002/message (Gemini Flash-Lite, optional)
 */

import { logger } from "@/lib/logger";
import { sendEmail, buildNurtureEmail, type EmailMessage, type EmailResult } from "@/lib/email/email-sender";
import { sendWhatsAppMessage, isWhatsAppConnected } from "@/lib/whatsapp/whatsapp-web";
import { NurtureEngine } from "./nurture-engine";
import { callLLM } from "@/lib/llm/call-llm";
import { getSetting, setSetting, dbList, upsertLead, upsertResult } from "@/lib/db";
import { getDefaultProvider, getDefaultModel } from "./default-config";
import { getDefaultBusinessProfile, type Lead, type NurtureSequence, type NurtureStep, type BusinessProfile } from "./types";
import { injectLeadData } from "./email-personalizer";
import { getCountryByCode, isWithinBusinessHours, getChannelOrderForCountry } from "./countries";
import type { CountryInfo } from "./countries";

// ========================================================================
// CONFIGURATION
// ========================================================================

export interface FollowupConfig {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  linkedinEnabled: boolean;
  phoneCallEnabled: boolean;
  maxFollowupsPerCycle: number;
  personalizeMessages: boolean; // Use LLM to personalize templates
  preferredModel: string;
  preferredProvider: string;
  bookingLink: string;
}

const DEFAULT_CONFIG: FollowupConfig = {
  emailEnabled: true,
  whatsappEnabled: true,
  smsEnabled: false,
  linkedinEnabled: false,
  phoneCallEnabled: false,
  maxFollowupsPerCycle: 10,
  personalizeMessages: false, // Off by default for $0 cost
  preferredModel: getDefaultModel("flash-lite"),
  preferredProvider: getDefaultProvider(),
  bookingLink: "https://www.healycommunity.com",
};


// ========================================================================
// FOLLOW-UP RESULT
// ========================================================================

export interface FollowupResult {
  sequenceId: string;
  leadId: string;
  leadName: string;
  stepNumber: number;
  channel: string;
  success: boolean;
  provider?: string;
  messageId?: string;
  error?: string;
  cost: number;
}

// ========================================================================
// 360 FOLLOW-UP ENGINE
// ========================================================================

export class FollowupEngine {
  private engine: NurtureEngine;

  constructor() {
    this.engine = new NurtureEngine();
  }

  async getConfig(): Promise<FollowupConfig> {
    const [
      emailEnabled,
      whatsappEnabled,
      maxFollowups,
      personalize,
      model,
      provider,
      bookingLink,
      globalProvider,
      globalModel,
    ] = await Promise.all([
      getSetting("followup_email_enabled"),
      getSetting("followup_whatsapp_enabled"),
      getSetting("followup_max_per_cycle"),
      getSetting("followup_personalize"),
      getSetting("followup_model"),
      getSetting("followup_provider"),
      getSetting("followup_booking_link"),
      getSetting("global_default_provider"),
      getSetting("global_default_model"),
    ]);

    return {
      ...DEFAULT_CONFIG,
      emailEnabled: emailEnabled !== "false",
      whatsappEnabled: whatsappEnabled !== "false",
      maxFollowupsPerCycle: maxFollowups ? parseInt(maxFollowups) : DEFAULT_CONFIG.maxFollowupsPerCycle,
      personalizeMessages: personalize === "true",
      preferredModel: model || globalModel || DEFAULT_CONFIG.preferredModel,
      preferredProvider: provider || globalProvider || DEFAULT_CONFIG.preferredProvider,
      bookingLink: bookingLink || DEFAULT_CONFIG.bookingLink,
    };
  }

  // ========================================================================
  // MAIN CYCLE: Run all due follow-ups
  // ========================================================================

  /**
   * Run the full follow-up cycle:
   * 1. Find all due nurture sequences
   * 2. Send the message on the best channel
   * 3. Advance the sequence
   * 4. Record results
   */
  async runFollowupCycle(): Promise<{
    results: FollowupResult[];
    totalSent: number;
    totalCost: number;
  }> {
    const config = await this.getConfig();
    const allActive = await this.engine.getActiveSequences();
    const results: FollowupResult[] = [];
    let totalCost = 0;

    // Limit how many we process per cycle
    const toProcess = allActive.slice(0, config.maxFollowupsPerCycle);

    for (const seq of toProcess) {
      try {
        const step = seq.steps[seq.currentStep];
        if (!step || step.status !== "pending") continue;

        // Check if step is due
        if (!this.isStepDue(seq, step)) continue;

        // Find the lead for this sequence
        const leads = await dbList<Lead>("leads");
        const lead = leads.find((l) => l.id === seq.leadId);
        if (!lead) continue;

        // Skip email steps if no email provider is configured
        // This prevents phantom "sent" follow-ups that never actually deliver
        if (step.type === "email") {
          const emailConfigured = await this.isEmailConfigured();
          if (!emailConfigured) {
            logger.warn("Followup", `Skipping email step ${step.stepNumber} for ${lead.name || seq.leadId} — no email provider configured`);
            // Skip to the next step without marking as sent
            await this.engine.advanceSequence(seq.id);
            continue;
          }
        }

        // Send the follow-up on the appropriate channel
        const result = await this.sendFollowUp(seq, step, lead, config);
        results.push(result);
        totalCost += result.cost;

        // Advance the sequence
        if (result.success) {
          await this.engine.advanceSequence(seq.id);
        }
      } catch (error) {
        results.push({
          sequenceId: seq.id,
          leadId: seq.leadId,
          leadName: seq.name,
          stepNumber: seq.currentStep,
          channel: "unknown",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          cost: 0,
        });
      }
    }

    return { results, totalSent: results.filter((r) => r.success).length, totalCost };
  }

  // ========================================================================
  // CHANNEL DISPATCH
  // ========================================================================

  /**
   * Send a single follow-up step on the best available channel.
   * Priority: WhatsApp first (mandatory), then email as fallback.
   * If both fail, the step is tracked but the sequence still advances.
   */
  private async sendFollowUp(
    seq: NurtureSequence,
    step: NurtureStep,
    lead: Lead,
    config: FollowupConfig
  ): Promise<FollowupResult> {
    // Use country-aware channel ordering when lead has country info, otherwise use default
    const channels = lead.country ? this.getChannelsForLead(lead, config) : this.getChannelsForStep(step, config);

    for (const channel of channels) {
      switch (channel) {
        case "whatsapp":
          // WhatsApp is ALWAYS tried first when phone is available
          if (lead.phone && config.whatsappEnabled) {
            const result = await this.sendWhatsAppFollowUp(seq, lead, step, config);
            if (result && result.success) {
              logger.info("Followup", `WhatsApp sent to ${lead.name} for step ${step.stepNumber}`);
              return result;
            }
            // WhatsApp failed — log it, but continue to try email
            logger.warn("Followup", `WhatsApp failed for ${lead.name} (${result?.error || "unknown"}), trying email`);
          }
          // Fall through to email

        case "email":
          if (lead.email && config.emailEnabled) {
            const result = await this.sendEmailFollowUp(lead, step, config, seq);
            if (result.success) {
              logger.info("Followup", `Email sent to ${lead.name} for step ${step.stepNumber}`);
              return result;
            }
            logger.warn("Followup", `Email also failed for ${lead.name} (${result.error})`);
          }
          break;

        case "sms":
          logger.warn("Followup", `SMS fallback for ${lead.name} — not implemented (requires Twilio)`);
          return this.createResult(seq, lead, step, "sms", false, "SMS not available", 0);

        case "linkedin_message":
          return this.createResult(seq, lead, step, "linkedin_message", false, "LinkedIn not available", 0);

        case "phone_call":
          return this.createResult(seq, lead, step, "phone_call", false, "Phone call tracked", 0);

        default:
          return this.createResult(seq, lead, step, channel, false, "Unknown channel", 0);
      }
    }

    // No working channel available (no email and no phone) — skip and still advance the sequence
    logger.warn("Followup", `No channel available for ${lead.name} (no email or phone) step ${step.stepNumber} — skipping`);
    return this.createResult(seq, lead, step, step.type, true, "No channel available - skipped", 0);
  }

  /**
   * Get the ordered list of channels to try for a step.
   * Uses country-aware channel ordering:
   *   - APAC/LATAM: WhatsApp first (mandatory), then email
   *   - EU/NA: Email first, then WhatsApp
   *
   * This reflects both mandatory WhatsApp followup AND
   * country-specific communication preferences.
   */
  private getChannelsForStep(step: NurtureStep, config: FollowupConfig): string[] {
    // If we have a lead context, use country-aware ordering
    // Default: WhatsApp first (mandatory), email fallback
    const channels: string[] = [];

    // WhatsApp is always available in the channel list
    if (config.whatsappEnabled) {
      channels.push("whatsapp");
    }

    // Email is the primary fallback
    if (config.emailEnabled) {
      channels.push("email");
    }

    return channels;
  }

  /**
   * Get country-aware channel order for a specific lead.
   * Used in sendFollowUp to dynamically order channels based on lead's country.
   *   APAC/LATAM (whatsapp channelPreference): WhatsApp first, email second
   *   EU/NA (email channelPreference): Email first, WhatsApp second
   */
  private getChannelsForLead(lead: Lead, config: FollowupConfig): string[] {
    // Detect country from lead data
    const countryInfo = lead.country ? getCountryByCode(lead.country) : undefined;
    const order = getChannelOrderForCountry(countryInfo);
    
    // Filter to only enabled channels
    return order.filter((ch) => {
      if (ch === "whatsapp") return config.whatsappEnabled;
      if (ch === "email") return config.emailEnabled;
      return true;
    });
  }

  // ========================================================================
  // EMAIL FOLLOW-UP ($0 via Gmail SMTP)
  // ========================================================================

  private async sendEmailFollowUp(
    lead: Lead,
    step: NurtureStep,
    config: FollowupConfig,
    seq: NurtureSequence
  ): Promise<FollowupResult> {
    // Inject scraped business data into template, then optionally personalize with LLM
    let template = injectLeadData(step.template, lead);
    let cost = 0;

    if (config.personalizeMessages) {
      try {
        const profile = await this._getBusinessProfile();
        const personalized = await callLLM(
          `You are a sales assistant for ${profile.businessName}. Personalize the following nurture message for ${lead.name}. Keep the same message but make it feel personal. Output ONLY the personalized message text, no JSON, no explanations.`,
          `Original message: "${step.template}"\n\nLead: ${lead.name}\nCompany: ${lead.company}\nRole: ${lead.role}\nNotes: ${lead.notes || "N/A"}`,
          {
            model: config.preferredModel,
            temperature: 0.5,
            maxTokens: 300,
            provider: config.preferredProvider as any,
          }
        );
        if (personalized) template = personalized;
        // Estimate cost: ~100 input + 100 output tokens with Flash-Lite
        cost = 0.00003;
      } catch {
        // Fall back to default template ($0)
      }
    }

    const bookingLink = config.bookingLink || "https://www.healycommunity.com";
    const email = buildNurtureEmail({
      leadName: lead.name,
      step: { subject: step.subject, template },
      businessName: "Wellness Advisor", // Anonymous until booking
      bookingLink,
    });

    const result = await sendEmail({
      to: lead.email,
      subject: email.subject,
      body: email.html,
      textBody: email.text,
    });

    return this.createResult(
      seq, lead, step, "email",
      result.success,
      result.error,
      cost,
      result.messageId
    );
  }

  // ========================================================================
  // WHATSAPP FOLLOW-UP ($0 via WhatsApp Web)
  // ========================================================================

  private async sendWhatsAppFollowUp(
    seq: NurtureSequence,
    lead: Lead,
    step: NurtureStep,
    config: FollowupConfig
  ): Promise<FollowupResult | null> {
    const connected = await isWhatsAppConnected();
    if (!connected || !lead.phone) {
      return null; // silently skip — pipeline works email-only
    }

    // Check if within business hours for the lead's country
    const countryInfo = lead.country ? getCountryByCode(lead.country) : undefined;
    if (countryInfo && !isWithinBusinessHours(countryInfo)) {
      // Outside business hours — still send but log note
      logger.info("Followup", `Sending WhatsApp to ${lead.name} in ${countryInfo.name} — outside business hours (UTC: ${new Date().getUTCHours()})`);
    }

    // Inject scraped business data into WhatsApp message
    let message = injectLeadData(step.template, lead);
    let cost = 0;

    if (config.personalizeMessages) {
      try {
        const personalized = await callLLM(
          `Personalize this WhatsApp message for ${lead.name}. Keep it concise (under 500 chars). WhatsApp is casual. Output ONLY the message text.`,
          `Message: "${step.template}"\n\nLead: ${lead.name}\nCompany: ${lead.company}`,
          {
            model: config.preferredModel,
            temperature: 0.5,
            maxTokens: 200,
            provider: config.preferredProvider as any,
          }
        );
        if (personalized) message = personalized;
        cost = 0.00002;
      } catch {}
    }

    // Add booking link if available
    const bookingLink = config.bookingLink || "https://www.healycommunity.com";
    if (!message.includes(bookingLink) && message.length < 400) {
      message += `\n\nBook a free consultation: ${bookingLink}`;
    }

    const result = await sendWhatsAppMessage(lead.phone || "", message);

    return this.createResult(
      seq, lead, step, "whatsapp",
      result.success, result.error, cost
    );
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Check if the email provider is actually configured to send.
   * This prevents phantom "sent" follow-ups when no email provider is set up.
   */
  private async isEmailConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.emailEnabled) return false;

    // Check that at least one email credential is set
    const [provider, gmailUser, gmailPass, resendKey, sendgridKey] = await Promise.all([
      getSetting("email_provider"),
      getSetting("email_gmail_user"),
      getSetting("email_gmail_app_password"),
      getSetting("email_resend_api_key"),
      getSetting("email_sendgrid_api_key"),
    ]);

    if (provider === "gmail_smtp" || !provider) {
      return !!(gmailUser || process.env.EMAIL_GMAIL_USER) &&
             !!(gmailPass || process.env.EMAIL_GMAIL_APP_PASSWORD);
    }
    if (provider === "resend") return !!(resendKey || process.env.RESEND_API_KEY);
    if (provider === "sendgrid") return !!(sendgridKey || process.env.SENDGRID_API_KEY);

    return false;
  }

  /**
   * Check if a step is due based on delay from the sequence start
   */
  private isStepDue(seq: NurtureSequence, step: NurtureStep): boolean {
    const startedAt = seq.startedAt.getTime();
    const totalDelayDays = seq.steps
      .slice(0, seq.currentStep)
      .reduce((sum, s) => sum + s.delayDays, 0);
    const dueAt = new Date(startedAt + (totalDelayDays + step.delayDays) * 24 * 60 * 60 * 1000);
    return Date.now() >= dueAt.getTime();
  }

  private createResult(
    seqOrLead: NurtureSequence | Lead,
    leadOrStep: Lead | NurtureStep,
    stepOrChannel: NurtureStep | string,
    channelOrSuccess: string | boolean,
    successOrError?: boolean | string,
    error?: string,
    cost?: number,
    messageId?: string
  ): FollowupResult {
    // Determine which overload we're using
    const seq = seqOrLead as NurtureSequence;
    const lead = leadOrStep as Lead;
    const step = stepOrChannel as NurtureStep;
    const channel = typeof stepOrChannel === "string" ? stepOrChannel : typeof channelOrSuccess === "string" ? channelOrSuccess : "unknown";
    const success = typeof successOrError === "boolean" ? successOrError : false;
    const err = typeof successOrError === "string" ? successOrError : error || undefined;

    return {
      sequenceId: seq.id || "unknown",
      leadId: lead.id,
      leadName: lead.name,
      stepNumber: (step as any)?.stepNumber || 0,
      channel,
      success,
      error: err,
      cost: cost || 0,
      messageId,
    };
  }

  /**
   * Get business profile from DB settings (server-safe)
   */
  private async _getBusinessProfile(): Promise<BusinessProfile> {
    try {
      const name = await getSetting("pipeline_business_name");
      if (name) {
        const industry = await getSetting("pipeline_business_industry");
        return {
          businessName: name,
          industry: industry || getDefaultBusinessProfile().industry,
          targetAudience: (await getSetting("pipeline_business_audience")) || getDefaultBusinessProfile().targetAudience,
          productDescription: (await getSetting("pipeline_business_product_desc")) || getDefaultBusinessProfile().productDescription,
          keySellingPoints: (await getSetting("pipeline_business_selling_points")) || getDefaultBusinessProfile().keySellingPoints,
          brandVoice: (await getSetting("pipeline_business_voice")) || getDefaultBusinessProfile().brandVoice,
        };
      }
    } catch {}
    return getDefaultBusinessProfile();
  }
}

// Singleton
let followupInstance: FollowupEngine | null = null;

export function getFollowupEngine(): FollowupEngine {
  if (!followupInstance) {
    followupInstance = new FollowupEngine();
  }
  return followupInstance;
}
