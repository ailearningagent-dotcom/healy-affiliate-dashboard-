import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { dbList, upsertLead } from "@/lib/db";
import { computeLeadTemperature, type Lead } from "@/lib/agents/types";

/**
 * POST /api/leads/recompute-temperatures
 *
 * Scans all leads and re-computes their temperature (cold / warm / hot)
 * based on current score, status, and engagement state.
 *
 * Temperature logic (from types.ts):
 *   Hot:  status=appointment_scheduled/closed, replied=qualified, score >= 70
 *   Warm: status=contacted or score >= 40
 *   Cold: everything else
 */
export async function POST() {
  try {
    const leads = await dbList<Lead>("leads");
    let updated = 0;
    let unchanged = 0;
    const breakdown = { cold: 0, warm: 0, hot: 0 };

    for (const lead of leads) {
      const newTemperature = computeLeadTemperature({
        score: lead.score,
        status: lead.status,
        replied: lead.status === "qualified" || lead.status === "appointment_scheduled" || lead.status === "closed",
      });

      if (newTemperature !== lead.temperature) {
        await upsertLead({
          ...lead,
          temperature: newTemperature,
        });
        updated++;
      } else {
        unchanged++;
      }

      // Count for response breakdown
      breakdown[newTemperature]++;
    }

    logger.info(
      "TemperatureRecompute",
      `Recomputed ${leads.length} leads: ${updated} updated, ${unchanged} unchanged. Breakdown: ${JSON.stringify(breakdown)}`
    );

    return NextResponse.json({
      success: true,
      totalLeads: leads.length,
      updated,
      unchanged,
      breakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("TemperatureRecompute", `Failed: ${message}`);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
