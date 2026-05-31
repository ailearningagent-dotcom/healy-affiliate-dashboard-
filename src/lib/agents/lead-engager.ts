/**
 * LeadEngager — Immediate Lead Engagement Trigger
 *
 * When a new lead is added (manual or auto-scraped), this module:
 * 1. Creates a nurture sequence (default templates, no LLM cost)
 * 2. Sends the first email if the lead has an email address
 * 3. Sends the first WhatsApp message if the lead has a phone number
 * 4. Marks the lead as "contacted"
 * 5. Wires booking signals for auto-booker
 *
 * Cost: $0 (uses default templates + Gmail SMTP + WhatsApp Web)
 * LLM personalization: ~$0.00005/lead (Gemini Flash-Lite, optional)
 */

import { logger } from "@/lib/logger";
import { NurtureEngine } from "./nurture-engine";
import { sendEmail, buildNurtureEmail } from "@/lib/email/email-sender";
import { sendWhatsAppMessage, isWhatsAppConnected } from "@/lib/whatsapp/whatsapp-web";
import { callLLM } from "@/lib/llm/call-llm";
import { getSetting, dbList, upsertLead, upsertResult } from "@/lib/db";
import { getDefaultProvider, getDefaultModel } from "./default-config";
import { getDefaultBusinessProfile, computeLeadTemperature, type Lead, type BusinessProfile, type NurtureSequence } from "./types";

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

// ========================================================================
// MAIN ENGAGEMENT FUNCTION
// ========================================================================

/**
 * Engage a lead immediately after creation.
 * Orchestrates: nurture setup → email → WhatsApp → status update
 */
export async function engageLead(lead: Lead): Promise<EngagementResult> {
  const result: EngagementResult = {
    leadId: lead.id,
    leadName: lead.name,
    sequenceCreated: false,
    emailSent: false,
    whatsappSent: false,
    cost: 0,
  };

  try {
    // Step 1: Create nurture sequence
    const engine = new NurtureEngine();
    const existingSequences = await engine.getSequencesByLead(lead.id);
    if (existingSequences.length === 0) {
      await engine.createSequence(lead, {
        name: `Auto-Engage: ${lead.name}`,
      });
      result.sequenceCreated = true;
    }

    // Step 2: Send first email if lead has an email
    if (lead.email) {
      const emailResult = await sendFirstEmail(lead, engine);
      result.emailSent = emailResult.success;
      result.emailError = emailResult.error;
      result.cost += emailResult.cost;
    }

    // Step 3: Send first WhatsApp message if lead has a phone
    if (lead.phone) {
      const whatsappResult = await sendFirstWhatsApp(lead, engine);
      result.whatsappSent = whatsappResult.success;
      result.whatsappError = whatsappResult.error;
      result.cost += whatsappResult.cost;
    }

    // Step 4: Update lead status to "contacted" and re-compute temperature
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
        nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      });
    } else {
      // Even if no message sent, still re-compute temperature (e.g. scored leads should warm up)
      const updatedTemperature = computeLeadTemperature({
        score: lead.score,
        status: lead.status,
      });
      if (updatedTemperature !== lead.temperature) {
        await upsertLead({ ...lead, temperature: updatedTemperature });
      }
    }

    // Record this engagement as an agent result for history
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

/**
 * Engage multiple leads in batch (used after pipeline scrape).
 */
export async function engageLeads(leads: Lead[]): Promise<EngagementResult[]> {
  const results: EngagementResult[] = [];
  for (const lead of leads) {
    const result = await engageLead(lead);
    results.push(result);
  }
  return results;
}

// ========================================================================
// INTERNAL: Send first email
// ========================================================================

async function sendFirstEmail(
  lead: Lead,
  engine: NurtureEngine
): Promise<{ success: boolean; error?: string; cost: number }> {
  // Get the first email template from the nurture sequence
  const sequences = await engine.getSequencesByLead(lead.id);
  if (sequences.length === 0) {
    return { success: false, error: "No nurture sequence found", cost: 0 };
  }

  const seq = sequences[0]!;
  const firstStep = seq.steps[0];
  if (!firstStep || firstStep.type !== "email") {
    return { success: false, error: "First step is not email", cost: 0 };
  }

  const profile = await getBusinessProfileForEngagement();
  const bookingLink = await getBookingLink();

  // Optionally personalize with LLM (free tier = Flash-Lite)
  let template = firstStep.template;
  let cost = 0;

  if (lead.notes && lead.notes.length > 10) {
    try {
      const personalized = await callLLM(
        `Personalize this outreach message for ${lead.name}. Keep the same message structure but add relevant details. Output ONLY the personalized message.`,
        `Original: "${firstStep.template}"\n\nLead: ${lead.name}\nCompany: ${lead.company}\nRole: ${lead.role}\nNotes: ${lead.notes}`,
        {
          model: getDefaultModel("flash-lite"),
          temperature: 0.5,
          maxTokens: 300,
          provider: getDefaultProvider() as any,
        }
      );
      if (personalized) template = personalized;
      cost = 0.00002;
    } catch {
      // Use default template ($0)
    }
  }

  const email = buildNurtureEmail({
    leadName: lead.name,
    step: { subject: firstStep.subject, template },
    businessName: profile.businessName,
    bookingLink,
  });

  try {
    const result = await sendEmail({
      to: lead.email,
      subject: email.subject,
      body: email.html,
      textBody: email.text,
    });

    // Advance the sequence to mark first step as sent
    if (result.success) {
      await engine.advanceSequence(seq.id);
    }

    return { success: result.success, error: result.error, cost };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed",
      cost,
    };
  }
}

// ========================================================================
// INTERNAL: Send first WhatsApp message
// ========================================================================

async function sendFirstWhatsApp(
  lead: Lead,
  engine: NurtureEngine
): Promise<{ success: boolean; error?: string; cost: number }> {
  const connected = await isWhatsAppConnected();
  if (!connected) {
    return { success: false, error: "WhatsApp not connected. Scan QR code in Settings.", cost: 0 };
  }

  // Get the first WhatsApp template from the nurture sequence
  const sequences = await engine.getSequencesByLead(lead.id);
  if (sequences.length === 0) {
    return { success: false, error: "No nurture sequence found", cost: 0 };
  }

  const seq = sequences[0]!;
  const waStep = seq.steps.find((s) => s.type === "whatsapp");
  if (!waStep) {
    return { success: false, error: "No WhatsApp step in sequence", cost: 0 };
  }

  let message = waStep.template;
  let cost = 0;

  if (lead.notes && lead.notes.length > 10) {
    try {
      const personalized = await callLLM(
        `Personalize this WhatsApp message for ${lead.name}. Keep it under 500 chars. Output ONLY the message.`,
        `Message: "${waStep.template}"\n\nLead: ${lead.name}\nCompany: ${lead.company}`,
        {
          model: getDefaultModel("flash-lite"),
          temperature: 0.5,
          maxTokens: 200,
          provider: getDefaultProvider() as any,
        }
      );
      if (personalized) message = personalized;
      cost = 0.00002;
    } catch {}
  }

  // Add booking link
  const bookingLink = await getBookingLink();
  if (!message.includes("book") && message.length < 400) {
    message += `\n\nBook a free consultation: ${bookingLink}`;
  }

  try {
    const result = await sendWhatsAppMessage(lead.phone || "", message);
    return { success: result.success, error: result.error, cost };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp send failed",
      cost,
    };
  }
}

// ========================================================================
// HELPER: Get business profile for engagement
// ========================================================================

async function getBusinessProfileForEngagement(): Promise<BusinessProfile> {
  try {
    const name = await getSetting("pipeline_business_name");
    if (name) {
      return {
        businessName: name,
        industry: (await getSetting("pipeline_business_industry")) || getDefaultBusinessProfile().industry,
        targetAudience: (await getSetting("pipeline_business_audience")) || getDefaultBusinessProfile().targetAudience,
        productDescription: (await getSetting("pipeline_business_product_desc")) || getDefaultBusinessProfile().productDescription,
        keySellingPoints: (await getSetting("pipeline_business_selling_points")) || getDefaultBusinessProfile().keySellingPoints,
        brandVoice: (await getSetting("pipeline_business_voice")) || getDefaultBusinessProfile().brandVoice,
      };
    }
  } catch {}
  return getDefaultBusinessProfile();
}

// ========================================================================
// HELPER: Get booking link from settings or default
// ========================================================================

async function getBookingLink(): Promise<string> {
  const link = await getSetting("followup_booking_link");
  return link || "/book";
}
