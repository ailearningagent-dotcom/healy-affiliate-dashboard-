/**
 * LeadEngager — Immediate Lead Engagement Trigger (Healy Edition)
 *
 * When a new lead is added, this module:
 * 1. Creates a 90-day Healy nurture sequence (20 emails)
 * 2. Sends the first Healy welcome email
 * 3. Sends the first WhatsApp message (if phone available)
 * 4. Marks the lead as "contacted"
 *
 * All templates reference Healy products, ask for phone number,
 * and CTA to https://www.healycommunity.com
 */

import { logger } from "@/lib/logger";
import { NurtureEngine } from "./nurture-engine";
import { sendEmail, buildNurtureEmail } from "@/lib/email/email-sender";
import { sendWhatsAppMessage, isWhatsAppConnected } from "@/lib/whatsapp/whatsapp-web";
import { getSetting, upsertLead, upsertResult } from "@/lib/db";
import { computeLeadTemperature, type Lead } from "./types";
import { detectCountry, getChannelOrderForCountry, getCountryByCode } from "./countries";
import { HEALY_BUSINESS_NAME, HEALY_SENDER_NAME, HEALY_CTA_LINK, HEALY_SENDER_PHONE, HEALY_WHATSAPP_LINK } from "./healy-email-sequences";
import { injectLeadData } from "./email-personalizer";

// ========================================================================
// ENGAGEMENT RESULT
// ========================================================================

export interface EngagementResult {
  leadId: string;
  leadName: string;
  sequenceCreated: boolean;
  emailSent: boolean;
  whatsappSent: boolean;
  emailError?: string;
  whatsappError?: string;
  cost: number;
}

interface SendResult {
  success: boolean;
  error?: string;
  cost: number;
  stepIndex: number;
}

// ========================================================================
// MAIN ENGAGEMENT FUNCTION
// ========================================================================

export async function engageLead(lead: Lead): Promise<EngagementResult> {
  const result: EngagementResult = {
    leadId: lead.id,
    leadName: lead.name,
    sequenceCreated: false,
    emailSent: false,
    whatsappSent: false,
    cost: 0,
  };

  if (!lead.email && !lead.phone) {
    logger.warn("LeadEngager", `Skipping ${lead.name} — no email or phone available`);
    return result;
  }

  try {
    const engine = new NurtureEngine();
    const existingSequences = await engine.getSequencesByLead(lead.id);
    if (existingSequences.length === 0) {
      await engine.createSequence(lead, {
        name: `Healy Journey: ${lead.name}`,
      });
      result.sequenceCreated = true;
    } else {
      logger.info("LeadEngager", `Skipping ${lead.name} — already has an existing nurture sequence`);
      return result;
    }

    const countryInfo = lead.country ? getCountryByCode(lead.country) : detectCountry({ phone: lead.phone, email: lead.email });
    const channelOrder = getChannelOrderForCountry(countryInfo);

    let maxSentStepIndex = -1;

    // WhatsApp first for APAC/LATAM countries
    if (lead.phone && channelOrder[0] === "whatsapp") {
      const whatsappResult = await sendFirstWhatsApp(lead, engine);
      result.whatsappSent = whatsappResult.success;
      result.whatsappError = whatsappResult.error;
      result.cost += whatsappResult.cost;
      if (whatsappResult.success) maxSentStepIndex = Math.max(maxSentStepIndex, whatsappResult.stepIndex);
    }

    // Send first email
    if (lead.email) {
      const emailResult = await sendFirstEmail(lead, engine);
      result.emailSent = emailResult.success;
      result.emailError = emailResult.error;
      result.cost += emailResult.cost;
      if (emailResult.success) maxSentStepIndex = Math.max(maxSentStepIndex, emailResult.stepIndex);
    }

    // WhatsApp for email-priority countries (tried second)
    if (lead.phone && channelOrder[0] !== "whatsapp" && !result.whatsappSent) {
      const whatsappResult = await sendFirstWhatsApp(lead, engine);
      result.whatsappSent = whatsappResult.success;
      result.whatsappError = whatsappResult.error;
      result.cost += whatsappResult.cost;
      if (whatsappResult.success) maxSentStepIndex = Math.max(maxSentStepIndex, whatsappResult.stepIndex);
    }

    // Advance sequence past sent steps
    if (maxSentStepIndex >= 0) {
      const seqs = await engine.getSequencesByLead(lead.id);
      if (seqs.length > 0) {
        const seqId = seqs[0].id;
        const seq = await engine.getSequence(seqId);
        if (seq) {
          while (seq.currentStep <= maxSentStepIndex) {
            await engine.advanceSequence(seqId);
            const updated = await engine.getSequence(seqId);
            if (!updated || updated.currentStep === seq.currentStep) break;
            seq.currentStep = updated.currentStep;
            seq.status = updated.status;
          }
        }
      }
    }

    // Update lead status
    if (result.emailSent || result.whatsappSent) {
      const updatedTemperature = computeLeadTemperature({
        score: lead.score,
        status: 'contacted',
        replied: false,
      });
      await upsertLead({
        ...lead,
        status: "contacted",
        pipelineStage: "contacted",
        temperature: updatedTemperature,
        lastContactedAt: new Date(),
        nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
    } else {
      const updatedTemperature = computeLeadTemperature({
        score: lead.score,
        status: lead.status,
      });
      if (updatedTemperature !== lead.temperature) {
        await upsertLead({ ...lead, temperature: updatedTemperature });
      }
    }

    await upsertResult({
      id: crypto.randomUUID(),
      agentType: "sales",
      status: "completed",
      output: JSON.stringify({
        type: "lead_engagement",
        leadId: lead.id,
        leadName: lead.name,
        emailSent: result.emailSent,
        whatsappSent: result.whatsappSent,
      }),
      createdAt: new Date(),
      metadata: {
        label: `Engaged: ${lead.name} — ${result.emailSent ? "📧" : ""}${result.whatsappSent ? "💬" : ""}`,
        cost: result.cost,
      },
    });

    logger.info("LeadEngager", `Engaged ${lead.name} — email:${result.emailSent} whatsapp:${result.whatsappSent}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    logger.error("LeadEngager", `Engagement failed for ${lead.name}: ${message}`);
  }

  return result;
}

export async function engageLeads(leads: Lead[]): Promise<EngagementResult[]> {
  const results: EngagementResult[] = [];
  for (const lead of leads) {
    const result = await engageLead(lead);
    results.push(result);
  }
  return results;
}

// ========================================================================
// HEALY FIRST EMAIL — Professional, warm, value-first, phone number request
// ========================================================================

async function sendFirstEmail(
  lead: Lead,
  engine: NurtureEngine
): Promise<SendResult> {
  const sequences = await engine.getSequencesByLead(lead.id);
  if (sequences.length === 0) {
    return { success: false, error: "No nurture sequence found", cost: 0, stepIndex: -1 };
  }

  const seq = sequences[0]!;
  const emailStepIndex = seq.steps.findIndex((s) => s.type === "email");
  if (emailStepIndex < 0) {
    return { success: false, error: "No email step in sequence", cost: 0, stepIndex: -1 };
  }

  const emailStep = seq.steps[emailStepIndex];
  let template = emailStep.template;

  // If no template yet, use the first Healy welcome template (enriched with scraped data)
  if (!template || template.includes("Follow up with")) {
    const rawTemplate = `Hi ${lead.name},

I came across {company} and was impressed by what you're building. I'm reaching out because I believe genuine wellness shouldn't be complicated. My name is ${HEALY_SENDER_NAME}, and I work with Healy — a German-engineered wellness technology that supports your body's natural balance through personalized microcurrent frequencies.

I'm not here to sell you anything. I'm here to offer something rare: a free, no-obligation conversation about what's possible when we approach wellness differently.

Many people I speak with are tired of quick fixes that don't last. They're looking for something that works with their body — not against it. That's where Healy comes in.

To learn more about the technology behind Healy, visit https://www.healyworld.net — their official site has a wealth of information.

If you'd like to explore whether this could be right for you, simply reply to this email with your phone number and a convenient time, and I'll personally reach out for a warm, no-pressure conversation.

In the meantime, I invite you to visit https://www.healycommunity.com to book your free consultation.

With warmth,
${HEALY_SENDER_NAME}
Wellness Advisor, Healy
${HEALY_SENDER_PHONE}
${HEALY_WHATSAPP_LINK}
https://www.healycommunity.com`;
    template = injectLeadData(rawTemplate, lead);
  }

  const email = buildNurtureEmail({
    leadName: lead.name,
    step: { subject: emailStep.subject || "Welcome — exploring a new approach to wellness", template },
    businessName: HEALY_BUSINESS_NAME,
    bookingLink: HEALY_CTA_LINK,
  });

  try {
    const result = await sendEmail({
      to: lead.email,
      subject: email.subject,
      body: email.html,
      textBody: email.text,
    });

    return { success: result.success, error: result.error, cost: 0, stepIndex: result.success ? emailStepIndex : -1 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed",
      cost: 0,
      stepIndex: -1,
    };
  }
}

// ========================================================================
// HEALY FIRST WHATSAPP — Conversational, phone-friendly
// ========================================================================

async function sendFirstWhatsApp(
  lead: Lead,
  engine: NurtureEngine
): Promise<SendResult> {
  const connected = await isWhatsAppConnected();
  if (!connected || !lead.phone) {
    return { success: false, error: "whatsapp_unavailable", cost: 0, stepIndex: -1 };
  }

  const sequences = await engine.getSequencesByLead(lead.id);
  if (sequences.length === 0) {
    return { success: false, error: "No nurture sequence found", cost: 0, stepIndex: -1 };
  }

  const seq = sequences[0]!;
  const waStepIndex = seq.steps.findIndex((s) => s.type === "whatsapp");
  if (waStepIndex < 0) {
    return { success: false, error: "No WhatsApp step in sequence", cost: 0, stepIndex: -1 };
  }

  const message = `Hi ${lead.name},\n\nI'm ${HEALY_SENDER_NAME} with Healy — a German frequency wellness technology. I came across your profile and thought you might be interested in exploring a natural approach to better sleep, energy, and stress management.\n\nI'd love to offer you a free, no-obligation consultation. You can book it here: ${HEALY_CTA_LINK}\n\nOr, if you prefer, just reply with your phone number and I'll call you personally.\n\nLooking forward to connecting!\n\n${HEALY_SENDER_NAME}\n${HEALY_SENDER_PHONE}`;

  try {
    const result = await sendWhatsAppMessage(lead.phone || "", message);
    return { success: result.success, error: result.error, cost: 0, stepIndex: result.success ? waStepIndex : -1 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp send failed",
      cost: 0,
      stepIndex: -1,
    };
  }
}
