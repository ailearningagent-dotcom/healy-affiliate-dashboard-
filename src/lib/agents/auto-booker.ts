/**
 * Appointment Auto-Booker — Autonomous Consultation Scheduling
 *
 * Monitors lead engagement signals and automatically books consultations
 * when a lead is ready:
 *   - Lead replied to nurture messages → qualification + booking
 *   - Lead score >= 70 → suggest appointment
 *   - Lead visited booking page but didn't complete → follow-up with link
 *   - Lead requested info → book discovery call
 *
 * Cost: $0 (uses default templates and calendar API)
 * AI enrichment: ~$0.0001/lead (Gemini Flash-Lite, optional)
 */

import { logger } from "@/lib/logger";
import { NurtureEngine } from "./nurture-engine";
import { getAgentManager } from "./agent-manager";
import {
  dbList,
  dbUpdate,
  upsertLead,
  upsertAppointment,
  getSetting,
} from "@/lib/db";
import {
  createCalendarEvent,
  isCalendarConnected,
} from "@/lib/calendar";
import { sendEmail, buildAppointmentEmail } from "@/lib/email/email-sender";
import type { Lead, Appointment, NurtureSequence, BusinessProfile } from "./types";

// ========================================================================
// BOOKING SIGNAL DETECTION
// ========================================================================

interface BookingSignal {
  lead: Lead;
  signal: "replied" | "high_score" | "web_visit" | "requested_info" | "sequence_completed";
  confidence: number; // 0-100
  preferredTime?: string;
  notes?: string;
}

// ========================================================================
// AUTO-BOOKER
// ========================================================================

export class AutoBooker {
  private nurtureEngine: NurtureEngine;

  constructor() {
    this.nurtureEngine = new NurtureEngine();
  }

  /**
   * Scan all leads for booking signals and auto-book when appropriate.
   * Returns results of booking attempts.
   */
  async scanAndBook(): Promise<{
    scanned: number;
    qualified: number;
    booked: number;
    errors: string[];
  }> {
    const leads = await dbList<Lead>("leads");
    const signals: BookingSignal[] = [];
    const errors: string[] = [];

    // Detect booking signals
    for (const lead of leads) {
      try {
        const signal = await this.detectSignal(lead);
        if (signal) signals.push(signal);
      } catch (e) {
        errors.push(`Error scanning ${lead.name}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    // Sort by confidence (highest first)
    signals.sort((a, b) => b.confidence - a.confidence);

    let booked = 0;
    for (const signal of signals.slice(0, 5)) {
      // Limit to 5 per scan to avoid overwhelming
      try {
        const result = await this.autoBook(signal);
        if (result) booked++;
      } catch (e) {
        errors.push(`Error booking ${signal.lead.name}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    return {
      scanned: leads.length,
      qualified: signals.length,
      booked,
      errors,
    };
  }

  /**
   * Detect if a lead is ready for booking
   */
  private async detectSignal(lead: Lead): Promise<BookingSignal | null> {
    // Already booked or lost
    if (lead.status === "appointment_scheduled" || lead.status === "closed" || lead.status === "lost") {
      return null;
    }

    // Signal 1: Lead replied to nurture messages (strongest signal)
    const sequences = await this.nurtureEngine.getSequencesByLead(lead.id);
    const repliedSteps = sequences.flatMap((s) =>
      s.steps.filter((step) => step.status === "replied")
    );

    if (repliedSteps.length > 0) {
      return {
        lead,
        signal: "replied",
        confidence: 90,
        notes: `Lead replied to nurture message #${repliedSteps[0].stepNumber}`,
      };
    }

    // Signal 2: High score lead
    if (lead.score >= 70 && lead.status === "new") {
      return {
        lead,
        signal: "high_score",
        confidence: 60,
        notes: `High scoring lead (${lead.score}) ready for qualification`,
      };
    }

    // Signal 3: Sequence completed (lead went through all steps)
    const completedSequences = sequences.filter((s) => s.status === "completed");
    if (completedSequences.length > 0 && !this.hasAppointment(lead.id)) {
      return {
        lead,
        signal: "sequence_completed",
        confidence: 75,
        notes: "Completed nurture sequence without booking",
      };
    }

    // Signal 4: Lead with contact info and good notes
    if (lead.email && lead.notes && lead.notes.length > 50 && lead.score >= 50) {
      return {
        lead,
        signal: "requested_info",
        confidence: 40,
        notes: "Lead has contact info and detailed notes",
      };
    }

    return null;
  }

  /**
   * Check if lead already has a scheduled appointment
   */
  private async hasAppointment(leadId: string): Promise<boolean> {
    const appointments = await dbList<Appointment>("appointments");
    return appointments.some(
      (a) => a.leadId === leadId && a.status === "scheduled"
    );
  }

  /**
   * Auto-book a consultation for a qualified lead
   */
  private async autoBook(signal: BookingSignal): Promise<boolean> {
    const { lead } = signal;

    // Update lead status
    await upsertLead({
      ...lead,
      status: "appointment_scheduled",
      pipelineStage: "consultation_booked",
      lastContactedAt: new Date(),
      nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    });

    // Find the next available slot (default: 2 days from now, 10am)
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 2);
    bookingDate.setHours(10, 0, 0, 0);

    const durationMinutes = 30;
    const endTime = new Date(bookingDate.getTime() + durationMinutes * 60 * 1000);

    // Create the appointment
    const manager = getAgentManager();
    const appointment = await manager.addAppointment({
      leadId: lead.id,
      leadName: lead.name,
      leadCompany: lead.company,
      dateTime: bookingDate,
      duration: durationMinutes,
      type: "discovery",
      status: "scheduled",
      notes: `Auto-booked. Signal: ${signal.signal}. ${signal.notes || ""}`,
      createdBy: "Auto-Booker AI",
    });

    // Create Google Calendar event if connected — extract actual Meet link from response
    let meetLink: string | undefined;
    const calendarConnected = await isCalendarConnected();
    if (calendarConnected) {
      const businessName = (await getSetting("business_name")) || "Business";
      const calendarEvent = await createCalendarEvent({
        summary: `${businessName} - Discovery Call with ${lead.name}`,
        description: `Auto-booked consultation\nLead: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone || "N/A"}\nLead ID: ${lead.id}\nAppointment ID: ${appointment.id}\nSignal: ${signal.signal}`,
        startTime: bookingDate.toISOString(),
        endTime: endTime.toISOString(),
        attendeeEmail: lead.email,
        attendeeName: lead.name,
      });
      if (calendarEvent) {
        // Use the actual Google Meet link generated by the Calendar API
        meetLink = calendarEvent.hangoutLink || `https://meet.google.com/`;
      }
    }

    // Send confirmation email with the actual Meet link
    if (lead.email) {
      const businessName = (await getSetting("pipeline_business_name")) || "AI Sales Agent";
      const email = buildAppointmentEmail({
        leadName: lead.name,
        businessName,
        dateTime: bookingDate,
        duration: durationMinutes,
        meetLink,
      });

      await sendEmail({
        to: lead.email,
        subject: email.subject,
        body: email.html,
        textBody: email.text,
      });
    }

    // Convert the nurture sequence to "converted" status
    const sequences = await this.nurtureEngine.getSequencesByLead(lead.id);
    for (const seq of sequences) {
      if (seq.status === "active") {
        await this.nurtureEngine.convertSequence(seq.id);
      }
    }

    logger.info("AutoBooker", `Booked ${lead.name} — ${lead.email} — ${bookingDate.toISOString()}`);
    return true;
  }
}

// Singleton
let bookerInstance: AutoBooker | null = null;

export function getAutoBooker(): AutoBooker {
  if (!bookerInstance) {
    bookerInstance = new AutoBooker();
  }
  return bookerInstance;
}
