import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentManager } from "@/lib/agents/agent-manager";
import { createCalendarEvent, isCalendarConnected } from "@/lib/calendar";
import { getSetting, dbList } from "@/lib/db";
import { checkRateLimit, getRateLimitId } from "@/lib/rate-limit";
import type { LeadSource, LeadSourceStatus, Appointment } from "@/lib/agents/types";

const bookingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.parse(body);

    const startTime = new Date(parsed.startTime);
    const endTime = new Date(parsed.endTime);

    // Validate the time slot is in the future
    if (startTime <= new Date()) {
      return NextResponse.json(
        { error: "Selected time must be in the future" },
        { status: 400 }
      );
    }

    // Validate the time slot duration is reasonable (15-180 min)
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    if (durationMinutes < 15 || durationMinutes > 180) {
      return NextResponse.json(
        { error: "Invalid meeting duration" },
        { status: 400 }
      );
    }

    // Rate limiting: max 5 bookings per IP per hour
    const rl = checkRateLimit(getRateLimitId(request), {
      maxRequests: 5,
      windowSeconds: 3600,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many booking attempts. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Check for conflicting bookings in the local DB (prevents double-booking race conditions)
    const existingAppointments = await dbList<Appointment>("appointments");
    const hasConflict = existingAppointments.some((apt) => {
      if (apt.status === "cancelled") return false;
      const aptStart = new Date(apt.dateTime).getTime();
      const aptEnd = aptStart + (apt.duration || 30) * 60 * 1000;
      return startTime.getTime() < aptEnd && endTime.getTime() > aptStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: "This time slot is no longer available. Please choose another." },
        { status: 409 }
      );
    }

    const manager = getAgentManager();

    // Create a lead from the booking
    const lead = await manager.addLead({
      name: parsed.name,
      company: "",
      role: "",
      email: parsed.email,
      phone: parsed.phone,
      status: "appointment_scheduled",
      score: 50,
      notes: "Booked via public booking page",
      personaType: "customer",
      source: "website" as LeadSource,
      pipelineStage: "consultation_booked" as LeadSourceStatus,
    });

    // Create the appointment
    const appointment = await manager.addAppointment({
      leadId: lead.id,
      leadName: parsed.name,
      leadCompany: "",
      dateTime: startTime,
      duration: durationMinutes,
      type: "discovery",
      status: "scheduled",
      notes: `Booked via public booking page. Phone: ${parsed.phone}`,
      createdBy: "Booking System",
    });

    // Create Google Calendar event if connected
    let googleEventId: string | null = null;
    let meetLink: string | undefined;
    const connected = await isCalendarConnected();
    if (connected) {
      const businessName = (await getSetting("business_name")) || "Business";
      const calendarEvent = await createCalendarEvent({
        summary: `${businessName} - Discovery Call with ${parsed.name}`,
        description: [
          `New booking from ${parsed.name}`,
          `Email: ${parsed.email}`,
          `Phone: ${parsed.phone}`,
          "",
          `Lead ID: ${lead.id}`,
          `Appointment ID: ${appointment.id}`,
        ].join("\n"),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendeeEmail: parsed.email,
        attendeeName: parsed.name,
      });
      if (calendarEvent) {
        googleEventId = calendarEvent.id;
        meetLink = calendarEvent.hangoutLink;
      }
    }

    return NextResponse.json(
      {
        success: true,
        lead,
        appointment,
        googleEventId,
        meetLink,
        message: "Appointment booked successfully!",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Booking", "Booking error", { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to book appointment" },
      { status: 500 }
    );
  }
}
