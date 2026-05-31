import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentManager } from "@/lib/agents/agent-manager";
import { computeLeadTemperature, type LeadSource } from "@/lib/agents/types";

const LEAD_SOURCES = ["manual", "directory", "apollo", "linkedin", "csv_import", "referral", "website"] as const;

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "appointment_scheduled", "closed", "lost"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
  personaType: z.string().optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  pipelineStage: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateLeadSchema.parse(body);
    const manager = getAgentManager();

    let lead = await manager.getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Merge updates
    const updatedLead = {
      ...lead,
      ...parsed,
    };

    // Re-compute temperature based on new status/score
    const newTemperature = computeLeadTemperature({
      score: updatedLead.score ?? lead.score,
      status: updatedLead.status ?? lead.status,
      replied: updatedLead.status === 'qualified' || updatedLead.status === 'appointment_scheduled' || updatedLead.status === 'closed',
    });
    updatedLead.temperature = newTemperature;

    lead = await manager.updateLead(id, updatedLead as Record<string, unknown>);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update lead" },
      { status: 500 }
    );
  }
}
