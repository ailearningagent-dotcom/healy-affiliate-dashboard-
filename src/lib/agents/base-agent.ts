import type { AgentConfig, AgentResult, AgentType } from "./types";

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected apiKey: string | undefined;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract execute(input: string, context?: Record<string, unknown>): Promise<AgentResult>;

  getConfig(): AgentConfig {
    return this.config;
  }

  protected setApiKey(key?: string): void {
    this.apiKey = key;
  }

  protected createResult(
    agentType: AgentType,
    output: string,
    metadata?: Record<string, unknown>
  ): AgentResult {
    return {
      id: crypto.randomUUID(),
      agentType,
      status: "completed",
      output,
      createdAt: new Date(),
      metadata,
    };
  }

  protected createErrorResult(agentType: AgentType, error: string): AgentResult {
    return {
      id: crypto.randomUUID(),
      agentType,
      status: "error",
      output: "",
      error,
      createdAt: new Date(),
    };
  }
}
