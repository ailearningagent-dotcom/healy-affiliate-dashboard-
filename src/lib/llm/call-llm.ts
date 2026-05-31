import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "@/lib/utils/retry";

// ============ PROVIDER TYPES ============

export type LLMProvider = "openai" | "gemini" | "claude" | "openrouter" | "groq" | "deepseek" | "xai" | "mistral" | "together";

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  provider?: LLMProvider;
  useWebSearch?: boolean;
}

// ============ PROVIDER CONFIGS ============

interface ProviderConfig {
  envKey: string;
  storageKey: string;
  defaultModel: string;
  models: { id: string; label: string; cost: string }[];
}

export const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    envKey: "OPENAI_API_KEY",
    storageKey: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini", cost: "Cheapest ($0.15/$0.60 per 1M)" },
      { id: "gpt-4o", label: "GPT-4o", cost: "Standard ($2.50/$10 per 1M)" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", cost: "New gen, cheap ($0.40/$1.60 per 1M)" },
      { id: "gpt-4.1", label: "GPT-4.1", cost: "Best quality ($2.00/$8.00 per 1M)" },
    ],
  },
  gemini: {
    envKey: "GEMINI_API_KEY",
    storageKey: "GEMINI_API_KEY",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", cost: "Fast & cheap (free tier available)" },
      { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite", cost: "Cheapest Gemini" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", cost: "Latest, balanced" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", cost: "Best quality Gemini" },
    ],
  },
  claude: {
    envKey: "ANTHROPIC_API_KEY",
    storageKey: "ANTHROPIC_API_KEY",
    defaultModel: "claude-3-5-haiku-20241022",
    models: [
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", cost: "Fast & cheap ($0.80/$4.00 per 1M)" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", cost: "Best balance ($3.00/$15 per 1M)" },
      { id: "claude-opus-4-20250514", label: "Claude Opus 4", cost: "Best quality ($15/$75 per 1M)" },
    ],
  },
  groq: {
    envKey: "GROQ_API_KEY",
    storageKey: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", cost: "Fast — $0.59/$0.79 per 1M" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", cost: "Cheapest — $0.05/$0.08 per 1M" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B", cost: "Latest — $0.11/$0.34 per 1M" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", cost: "Strong — $0.24/$0.24 per 1M" },
    ],
  },
  deepseek: {
    envKey: "DEEPSEEK_API_KEY",
    storageKey: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-v4-flash",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", cost: "Cheap — $0.14/$0.28 per 1M" },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", cost: "Premium — $1.74/$3.48 per 1M" },
      { id: "deepseek-chat", label: "DeepSeek V3 Chat (legacy)", cost: "Legacy — $0.27/$1.10 per 1M" },
      { id: "deepseek-reasoner", label: "DeepSeek R1 (legacy)", cost: "Legacy — $0.55/$2.19 per 1M" },
    ],
  },
  xai: {
    envKey: "XAI_API_KEY",
    storageKey: "XAI_API_KEY",
    defaultModel: "grok-4.3",
    models: [
      { id: "grok-4.3", label: "Grok 4.3", cost: "Flagship — $1.25/$2.50 per 1M" },
      { id: "grok-build-0.1", label: "Grok Build 0.1", cost: "Coding — $1.00/$2.00 per 1M" },
      { id: "grok-4.20-0309-reasoning", label: "Grok 4.20 Reasoning", cost: "Reasoning — $1.25/$2.50 per 1M" },
    ],
  },
  mistral: {
    envKey: "MISTRAL_API_KEY",
    storageKey: "MISTRAL_API_KEY",
    defaultModel: "mistral-large-latest",
    models: [
      { id: "mistral-large-latest", label: "Mistral Large", cost: "Best — $2.00/$6.00 per 1M" },
      { id: "mistral-small-latest", label: "Mistral Small", cost: "Fast — $0.20/$0.60 per 1M" },
      { id: "codestral-latest", label: "Codestral", cost: "Coding — $0.25/$1.00 per 1M" },
      { id: "ministral-3-8b", label: "Ministral 3 8B", cost: "Tiny — $0.10/$0.30 per 1M" },
    ],
  },
  together: {
    envKey: "TOGETHER_API_KEY",
    storageKey: "TOGETHER_API_KEY",
    defaultModel: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    models: [
      { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", label: "Llama 4 Scout (Together)", cost: "~$0.11/$0.34 per 1M" },
      { id: "deepseek-ai/DeepSeek-V4-Pro", label: "DeepSeek V4 Pro (Together)", cost: "~$1.74/$3.48 per 1M" },
      { id: "Qwen/Qwen3-70B-Instruct", label: "Qwen 3 70B (Together)", cost: "~$0.89/$0.89 per 1M" },
      { id: "google/gemma-4-9b-it", label: "Gemma 4 9B (Together)", cost: "~$0.10/$0.10 per 1M" },
    ],
  },
  openrouter: {
    envKey: "OPENROUTER_API_KEY",
    storageKey: "OPENROUTER_API_KEY",
    defaultModel: "openai/gpt-4o-mini",
    models: [
      { id: "openai/gpt-4o-mini", label: "OpenRouter: GPT-4o Mini", cost: "Via OpenRouter" },
      { id: "openai/gpt-4o", label: "OpenRouter: GPT-4o", cost: "Via OpenRouter" },
      { id: "anthropic/claude-3.5-sonnet", label: "OpenRouter: Claude 3.5", cost: "Via OpenRouter" },
      { id: "google/gemini-2.0-flash", label: "OpenRouter: Gemini 2.0", cost: "Via OpenRouter" },
    ],
  },
};

// ============ KEY RESOLUTION ============

function resolveApiKey(provider: LLMProvider, overrideKey?: string): string | undefined {
  if (overrideKey) return overrideKey;
  const config = PROVIDER_CONFIGS[provider];
  // Try env var first (server-side), then nothing else (keys are passed from client)
  return process.env[config.envKey] || undefined;
}

// ============ PROVIDER IMPLEMENTATIONS ============

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  const apiKey = resolveApiKey("openai", options.apiKey);
  if (!apiKey) throw new Error("OpenAI API key is required. Add it in Settings.");
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: options.model ?? "gpt-4o-mini",
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  const apiKey = resolveApiKey("gemini", options.apiKey);
  if (!apiKey) throw new Error("Gemini API key is required. Add it in Settings.");
  const genai = new GoogleGenAI({ apiKey });

  // When useWebSearch is true, enable Google Search grounding for real-time web results
  // This makes Gemini search the web in real-time and cite sources
  const response = await genai.models.generateContent({
    model: options.model ?? "gemini-2.0-flash",
    contents: `${systemPrompt}\n\n${userPrompt}`,
    config: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
      ...(options.useWebSearch ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });
  return response.text ?? "";
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  const apiKey = resolveApiKey("claude", options.apiKey);
  if (!apiKey) throw new Error("Claude API key is required. Add it in Settings.");
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: options.model ?? "claude-3-5-haiku-20241022",
    max_tokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.7,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("\n");
}

// ============ SHARED HELPER FOR OPENAI-COMPATIBLE PROVIDERS ============

/**
 * Call any OpenAI-compatible API (OpenAI, OpenRouter, Groq, DeepSeek, XAI, Mistral, Together, etc.)
 */
async function callOpenAICompatible(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions,
  providerConfig: { envKey: string; defaultModel: string; baseURL: string; label: string }
): Promise<string> {
  const apiKey = options.apiKey || process.env[providerConfig.envKey] || undefined;
  if (!apiKey) {
    throw new Error(`${providerConfig.label} API key is required. Add it in Settings or set ${providerConfig.envKey} in .env.local.`);
  }
  const client = new OpenAI({ apiKey, baseURL: providerConfig.baseURL });
  const completion = await client.chat.completions.create({
    model: options.model ?? providerConfig.defaultModel,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  return callOpenAICompatible(systemPrompt, userPrompt, options, {
    envKey: "OPENROUTER_API_KEY",
    defaultModel: "openai/gpt-4o-mini",
    baseURL: "https://openrouter.ai/api/v1",
    label: "OpenRouter",
  });
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  return callOpenAICompatible(systemPrompt, userPrompt, options, {
    envKey: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
    label: "Groq",
  });
}

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  return callOpenAICompatible(systemPrompt, userPrompt, options, {
    envKey: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-v4-flash",
    baseURL: "https://api.deepseek.com",
    label: "DeepSeek",
  });
}

async function callXAI(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  return callOpenAICompatible(systemPrompt, userPrompt, options, {
    envKey: "XAI_API_KEY",
    defaultModel: "grok-4.3",
    baseURL: "https://api.x.ai/v1",
    label: "xAI (Grok)",
  });
}

async function callMistral(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  return callOpenAICompatible(systemPrompt, userPrompt, options, {
    envKey: "MISTRAL_API_KEY",
    defaultModel: "mistral-large-latest",
    baseURL: "https://api.mistral.ai/v1",
    label: "Mistral AI",
  });
}

async function callTogether(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions
): Promise<string> {
  return callOpenAICompatible(systemPrompt, userPrompt, options, {
    envKey: "TOGETHER_API_KEY",
    defaultModel: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    baseURL: "https://api.together.ai/v1",
    label: "Together AI",
  });
}

// ============ MAIN UNIFIED FUNCTION ============

// ============ COST TRACKING ============

// Model pricing per 1M tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4.1-mini": { input: 0.40, output: 1.60 },
  "gpt-4.1": { input: 2.00, output: 8.00 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-pro": { input: 1.25, output: 10.00 },
  "claude-3-5-haiku-20241022": { input: 0.80, output: 4.00 },
  "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
  "claude-opus-4-20250514": { input: 15.00, output: 75.00 },
  // Groq
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "meta-llama/llama-4-scout-17b-16e-instruct": { input: 0.11, output: 0.34 },
  "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },
  // DeepSeek
  "deepseek-v4-flash": { input: 0.14, output: 0.28 },
  "deepseek-v4-pro": { input: 1.74, output: 3.48 },
  "deepseek-chat": { input: 0.27, output: 1.10 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
  // xAI (Grok)
  "grok-4.3": { input: 1.25, output: 2.50 },
  "grok-build-0.1": { input: 1.00, output: 2.00 },
  "grok-4.20-0309-reasoning": { input: 1.25, output: 2.50 },
  // Mistral
  "mistral-large-latest": { input: 2.00, output: 6.00 },
  "mistral-small-latest": { input: 0.20, output: 0.60 },
  "codestral-latest": { input: 0.25, output: 1.00 },
  "ministral-3-8b": { input: 0.10, output: 0.30 },
  // Together AI
  "deepseek-ai/DeepSeek-V4-Pro": { input: 1.74, output: 3.48 },
  "Qwen/Qwen3-70B-Instruct": { input: 0.89, output: 0.89 },
  "google/gemma-4-9b-it": { input: 0.10, output: 0.10 },
};

// Default pricing for unknown models
const DEFAULT_PRICING = { input: 1.00, output: 3.00 };

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface LLMUsage {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export function estimateCost(text: string, model: string, _provider: string): LLMUsage {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  // Estimate: ~200 input tokens for system + user prompts, estimate output from text length
  const inputTokens = 200;
  const outputTokens = estimateTokens(text);
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return {
    model,
    provider: _provider,
    inputTokens,
    outputTokens,
    inputCost: Math.round(inputCost * 10000) / 10000,
    outputCost: Math.round(outputCost * 10000) / 10000,
    totalCost: Math.round((inputCost + outputCost) * 10000) / 10000,
  };
}

// ============ MAIN UNIFIED FUNCTION ============

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options?: LLMCallOptions
): Promise<string> {
  const provider = options?.provider ?? "openai";

  const callFn = () => {
    switch (provider) {
      case "openai":
        return callOpenAI(systemPrompt, userPrompt, options ?? {});
      case "gemini":
        return callGemini(systemPrompt, userPrompt, options ?? {});
      case "claude":
        return callClaude(systemPrompt, userPrompt, options ?? {});
      case "openrouter":
        return callOpenRouter(systemPrompt, userPrompt, options ?? {});
      case "groq":
        return callGroq(systemPrompt, userPrompt, options ?? {});
      case "deepseek":
        return callDeepSeek(systemPrompt, userPrompt, options ?? {});
      case "xai":
        return callXAI(systemPrompt, userPrompt, options ?? {});
      case "mistral":
        return callMistral(systemPrompt, userPrompt, options ?? {});
      case "together":
        return callTogether(systemPrompt, userPrompt, options ?? {});
      default:
        return callOpenAI(systemPrompt, userPrompt, options ?? {});
    }
  };

  // Wrap with retry for transient network failures (timeouts, 5xx, rate limits)
  return withRetry(callFn, {
    maxRetries: 2,
    baseDelay: 1000,
    timeout: 30000, // 30s per attempt
    logger: (msg) => console.warn(`[LLM Retry] ${msg}`),
  });
}