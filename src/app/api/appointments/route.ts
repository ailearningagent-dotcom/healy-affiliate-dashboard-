import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentManager } from "@/lib/agents/agent-manager";
import { sendEmail, buildAppointmentEmail } from "@/lib/email/email-sender";
import { getSetting } from "@/lib/db";
import { logger } from "@/lib/logger";

const createAppointmentSchema = z.object({
  leadId: z.string().min(1),
  leadName: z.string().min(1),
  leadCompany: z.string().optional().default(""),
  leadEmail: z.string().email().optional(),
  leadPhone: z.string().optional(),
  dateTime: z.string().min(1).refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  duration: z.number().int().positive().optional().default(30),
  type: z.enum(["discovery", "demo", "proposal", "follow_up"]).optional().default("discovery"),
  notes: z.string().optional().default(""),
});

import { dbList } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  // Auth-protected — middleware handles session check
  // Returns all appointments for admin dashboard
  try {
    const appointments = await dbList("appointments", "date_time DESC");
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAppointmentSchema.parse(body);
    const manager = getAgentManager();

    const appointment = await manager.addAppointment({
      leadId: parsed.leadId,
      leadName: parsed.leadName,
      leadCompany: parsed.leadCompany,
      dateTime: new Date(parsed.dateTime),
      duration: parsed.duration,
      type: parsed.type,
      status: "scheduled",
      notes: parsed.notes,
      createdBy: "AI Agent",
    });

    // Send free confirmation email (fire-and-forget — never blocks booking)
    if (parsed.leadEmail) {
      const businessName = (await getSetting("pipeline_business_name")) || "Wellness Advisor";
      const emailConf = buildAppointmentEmail({
        leadName: parsed.leadName,
        businessName,
        dateTime: new Date(parsed.dateTime),
        duration: parsed.duration,
      });
      sendEmail({
        to: parsed.leadEmail,
        subject: emailConf.subject,
        body: emailConf.html,
        textBody: emailConf.text,
      }).then((r) => {
        if (!r.success) logger.warn("Appointments", `Confirmation email skipped: ${r.error}`);
      }).catch(() => {});
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create appointment" },
      { status: 500 }
    );
  }
}
