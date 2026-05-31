import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getPipelineOrchestrator } from "@/lib/agents/pipeline-orchestrator";
import { getSetting } from "@/lib/db";
import type { PipelineConfig } from "@/lib/agents/pipeline-orchestrator";

// ==================== AUTO-START ON SERVER BOOT ====================
// The pipeline checks on first request if it should be running.
// This means no manual action needed — it resumes on server restart.
// Use globalThis flag to survive Next.js hot module reloads.

async function autoStartPipeline(): Promise<void> {
  if ((globalThis as any).__pipelineAutoStarted) return;
  (globalThis as any).__pipelineAutoStarted = true;
  try {
    const enabled = await getSetting("pipeline_enabled");
    if (enabled === "true") {
      const orchestrator = getPipelineOrchestrator();
      await orchestrator.start();
      logger.info("Pipeline", "Auto-started from saved state.");
    }
  } catch (e) {
    logger.error("Pipeline", "Auto-start check failed", { error: String(e) });
  }
}

// Trigger auto-start check on module load
if (typeof globalThis !== "undefined") {
  // Schedule on next tick to allow DB to initialize
  setTimeout(() => {
    autoStartPipeline().catch(() => {});
  }, 100);
}

export async function GET() {
  try {
    const orchestrator = getPipelineOrchestrator();
    const [state, config] = await Promise.all([
      orchestrator.getState(),
      orchestrator.getConfig(),
    ]);

    return NextResponse.json({ state, config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get pipeline status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config: configUpdates } = body as {
      action?: "start" | "stop" | "tick" | "config";
      config?: Partial<PipelineConfig>;
    };

    const orchestrator = getPipelineOrchestrator();

    switch (action) {
      case "start": {
        await orchestrator.start();
        const [state, config] = await Promise.all([
          orchestrator.getState(),
          orchestrator.getConfig(),
        ]);
        return NextResponse.json({ status: "started", state, config });
      }

      case "stop": {
        await orchestrator.stop();
        const [state, config] = await Promise.all([
          orchestrator.getState(),
          orchestrator.getConfig(),
        ]);
        return NextResponse.json({ status: "stopped", state, config });
      }

      case "tick": {
        const result = await orchestrator.tick();
        const [state, config] = await Promise.all([
          orchestrator.getState(),
          orchestrator.getConfig(),
        ]);
        return NextResponse.json({ status: "tick_complete", result, state, config });
      }

      case "config": {
        if (configUpdates) {
          await orchestrator.updateConfig(configUpdates);
        }
        const [state, config] = await Promise.all([
          orchestrator.getState(),
          orchestrator.getConfig(),
        ]);
        return NextResponse.json({ status: "config_updated", state, config });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: start, stop, tick, config` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline control failed" },
      { status: 500 }
    );
  }
}
