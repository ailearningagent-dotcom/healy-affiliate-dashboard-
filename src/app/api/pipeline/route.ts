import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getPipelineOrchestrator } from "@/lib/agents/pipeline-orchestrator";
import type { PipelineConfig } from "@/lib/agents/pipeline-orchestrator";

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
