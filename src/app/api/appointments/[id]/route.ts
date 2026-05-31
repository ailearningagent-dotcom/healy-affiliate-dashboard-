import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentManager } from "@/lib/agents/agent-manager";

const updateAppointmentSchema = z.object({
  dateTime: z.string().optional(),
  duration: z.number().int().positive().optional(),
  type: z.enum(["discovery", "demo", "proposal", "follow_up"]).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string().optional(),
  leadName: z.string().optional(),
  leadCompany: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAppointmentSchema.parse(body);
    const manager = getAgentManager();

    // Convert dateTime string to Date for the Appointment type
    const updates: Record<string, unknown> = { ...parsed };
    if (typeof updates.dateTime === "string") {
      updates.dateTime = new Date(updates.dateTime);
    }

    const appointment = await manager.updateAppointment(id, updates);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update appointment" },
      { status: 500 }
    );
  }
}
