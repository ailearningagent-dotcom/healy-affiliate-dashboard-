import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentManager } from "@/lib/agents/agent-manager";

const createAppointmentSchema = z.object({
  leadId: z.string().min(1),
  leadName: z.string().min(1),
  leadCompany: z.string().optional().default(""),
  dateTime: z.string().min(1).refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  duration: z.number().int().positive().optional().default(30),
  type: z.enum(["discovery", "demo", "proposal", "follow_up"]).optional().default("discovery"),
  notes: z.string().optional().default(""),
});

export async function GET() {
  const manager = getAgentManager();
  const appointments = await manager.getAppointments();

  return NextResponse.json(appointments);
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
