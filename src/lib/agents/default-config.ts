/**
 * Default AI Provider & Model Configuration
 *
 * Centralized defaults for all server-side agent modules.
 * Set DEFAULT_AI_PROVIDER and/or DEFAULT_AI_MODEL in .env.local to override.
 *
 * Currently defaults to Gemini 2.0 Flash (free tier available).
 */

export function getDefaultProvider(): string {
  return process.env.DEFAULT_AI_PROVIDER || "gemini";
}

export function getDefaultModel(role: "flash" | "flash-lite" = "flash-lite"): string {
  const envModel = process.env.DEFAULT_AI_MODEL;
  if (envModel) return envModel;
  return role === "flash" ? "gemini-2.0-flash" : "gemini-2.0-flash-lite";
}
