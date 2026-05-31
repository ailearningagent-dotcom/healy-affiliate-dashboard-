import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentManager } from "@/lib/agents/agent-manager";
import { engageLead } from "@/lib/agents/lead-engager";
import { logger } from "@/lib/logger";
import type { LeadSource, LeadSourceStatus, LeadTemperature } from "@/lib/agents/types";

const LEAD_SOURCES = ["manual", "directory", "apollo", "linkedin", "csv_import", "referral", "website", "google-maps"] as const;
const LEAD_TEMPERATURES = ["cold", "warm", "hot"] as const;

const createLeadSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional().default(""),
  role: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "appointment_scheduled", "closed", "lost"]).optional().default("new"),
  score: z.number().int().min(0).max(100).optional().default(50),
  notes: z.string().optional().default(""),
  personaType: z.string().optional().default("customer"),
  source: z.enum(LEAD_SOURCES).optional().default("manual"),
  pipelineStage: z.string().optional(),
  temperature: z.enum(LEAD_TEMPERATURES).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const temperature = searchParams.get("temperature") as LeadTemperature | null;
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const manager = getAgentManager();
  let leads = await manager.getLeads();

  if (temperature && ["cold", "warm", "hot"].includes(temperature)) {
    leads = leads.filter((l) => (l.temperature ?? "cold") === temperature);
  }

  if (status) {
    leads = leads.filter((l) => l.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    leads = leads.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q)
    );
  }

  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createLeadSchema.parse(body);
    const manager = getAgentManager();

    const temperature = parsed.temperature ?? (parsed.score >= 70 ? "hot" as const : parsed.score >= 40 ? "warm" as const : "cold" as const);

    const lead = await manager.addLead({
      name: parsed.name,
      company: parsed.company,
      role: parsed.role,
      email: parsed.email,
      phone: parsed.phone,
      status: parsed.status,
      score: parsed.score,
      temperature,
      notes: parsed.notes,
      personaType: parsed.personaType,
      source: parsed.source as LeadSource,
      pipelineStage: (parsed.pipelineStage ?? (parsed.status === "contacted" ? "contacted" : "sourced")) as LeadSourceStatus,
    });

    // Immediately engage the new lead — create nurture sequence, send first email, WhatsApp
    if (lead.status === "new") {
      // Fire-and-forget: don't block the API response
      engageLead(lead).then((result) => {
        logger.info("LeadsAPI", `Engaged ${lead.name}: email=${result.emailSent} whatsapp=${result.whatsappSent}`);
      }).catch((err) => {
        logger.error("LeadsAPI", `Engagement failed for ${lead.name}: ${err}`);
      });
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create lead" },
      { status: 500 }
    );
  }
}
