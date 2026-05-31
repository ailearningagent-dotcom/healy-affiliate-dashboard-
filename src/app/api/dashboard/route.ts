import { NextResponse } from "next/server";
import { getAgentManager } from "@/lib/agents/agent-manager";

export async function GET() {
  try {
    const manager = getAgentManager();
    const metrics = await manager.getDashboardMetrics();

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("[Dashboard API] Failed to load metrics:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
