import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentManager } from "@/lib/agents/agent-manager";
import type { AgentType } from "@/lib/agents/types";

const VALID_AGENT_TYPES = ["content", "research", "outreach", "sales", "scraper"] as const;

const runAgentSchema = z.object({
  agentType: z.enum(VALID_AGENT_TYPES, `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(", ")}`),
  input: z.string().min(1),
  stream: z.boolean().optional(),
  apiKey: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  businessProfile: z.any().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = runAgentSchema.parse(body);
    const { agentType, input, context, stream } = parsed;

    // Pass API key, provider, model from request
    const manager = getAgentManager();
    const options = { ...((context as Record<string, unknown>) ?? {}) };
    if (body.apiKey) options.apiKey = body.apiKey;
    if (body.provider) options.provider = body.provider;
    if (body.model) options.model = body.model;
    if (body.businessProfile) options.businessProfile = body.businessProfile;

    // === SSE Streaming mode ===
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Send start event
            controller.enqueue(encoder.encode(sseEvent("start", {
              agentType,
              status: "running",
              timestamp: new Date().toISOString(),
            })));

            // Execute the agent
            const result = await manager.executeAgent(agentType as AgentType, input, options);

            if (result.status === "error") {
              controller.enqueue(encoder.encode(sseEvent("error", {
                error: result.error,
                agentType,
                status: "error",
                timestamp: new Date().toISOString(),
              })));
            } else {
              // Send progress update
              controller.enqueue(encoder.encode(sseEvent("status", {
                agentType,
                status: "processing",
                timestamp: new Date().toISOString(),
              })));

              // Send complete event with result
              controller.enqueue(encoder.encode(sseEvent("complete", {
                result,
                timestamp: new Date().toISOString(),
              })));
            }
          } catch (error) {
            controller.enqueue(encoder.encode(sseEvent("error", {
              error: error instanceof Error ? error.message : "Internal server error",
              status: "error",
            })));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // === Standard (non-streaming) mode ===
    const result = await manager.executeAgent(agentType as AgentType, input, options);

    if (result.status === "error") {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
