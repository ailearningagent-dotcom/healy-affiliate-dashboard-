import { NextResponse } from "next/server";
import { getAgentManager } from "@/lib/agents/agent-manager";

export async function GET() {
  try {
    const manager = getAgentManager();
    const content = await manager.getContentLibrary();

    return NextResponse.json({ content });
  } catch (error) {
    console.error("[Content API] Failed to load content:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load content library" },
      { status: 500 }
    );
  }
}
