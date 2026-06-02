import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getClient,
  updateClient,
  deleteClient,
  getClientMetrics,
  getClientLeads,
  getClientAppointments,
} from "@/lib/db";
import type { Lead, Appointment } from "@/lib/agents/types";

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  isActive: z.boolean().optional(),
});

interface LeadRow extends Lead {
  client_id?: string;
}

interface AppointmentRow extends Appointment {
  client_id?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClient(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [metrics, leads, appointments] = await Promise.all([
      getClientMetrics(id),
      getClientLeads(id),
      getClientAppointments(id),
    ]);

    // Compute enriched analytics
    const leadsTyped = leads as LeadRow[];
    const appointmentsTyped = appointments as AppointmentRow[];

    // Lead status distribution
    const statusDistribution: Record<string, number> = {};
    for (const l of leadsTyped) {
      statusDistribution[l.status] = (statusDistribution[l.status] || 0) + 1;
    }

    // Pipeline stage distribution
    const pipelineDistribution: Record<string, number> = {};
    for (const l of leadsTyped) {
      pipelineDistribution[l.pipelineStage] = (pipelineDistribution[l.pipelineStage] || 0) + 1;
    }

    // Lead source breakdown
    const sourceBreakdown: Record<string, number> = {};
    for (const l of leadsTyped) {
      sourceBreakdown[l.source] = (sourceBreakdown[l.source] || 0) + 1;
    }

    // Appointment status distribution
    const appointmentStatusDist: Record<string, number> = {};
    for (const a of appointmentsTyped) {
      appointmentStatusDist[a.status] = (appointmentStatusDist[a.status] || 0) + 1;
    }

    // Appointment type distribution
    const appointmentTypeDist: Record<string, number> = {};
    for (const a of appointmentsTyped) {
      appointmentTypeDist[a.type] = (appointmentTypeDist[a.type] || 0) + 1;
    }

    // Upcoming appointments (next 30 days)
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingAppointments = appointmentsTyped
      .filter((a) => new Date(a.dateTime) >= now && new Date(a.dateTime) <= thirtyDays)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    // Recent leads (last 7 days)
    const sevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentLeads = leadsTyped
      .filter((l) => new Date(l.createdAt) >= sevenDays)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Conversion rate
    const conversionRate = metrics.totalLeads > 0
      ? Math.round((metrics.appointmentsCompleted / metrics.totalLeads) * 100)
      : 0;

    // Qualified leads (score >= 70)
    const qualifiedLeads = leadsTyped.filter((l) => l.score >= 70).length;

    return NextResponse.json({
      ...client,
      metrics: {
        ...metrics,
        qualifiedLeads,
        conversionRate,
        totalAppointments: appointmentsTyped.length,
      },
      analytics: {
        statusDistribution,
        pipelineDistribution,
        sourceBreakdown,
        appointmentStatusDist,
        appointmentTypeDist,
      },
      leads: leadsTyped.slice(0, 10), // Only send latest 10
      appointments: appointmentsTyped.slice(0, 10),
      upcomingAppointments: upcomingAppointments.slice(0, 5),
      recentLeads: recentLeads.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateClientSchema.parse(body);

    const updated = await updateClient(id, parsed);
    if (!updated) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getClient(id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (id === "default") {
      return NextResponse.json(
        { error: "Cannot delete the default client" },
        { status: 400 }
      );
    }

    await deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete client" },
      { status: 500 }
    );
  }
}
