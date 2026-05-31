import OpenAI from "openai";

let cachedOpenAI: OpenAI | null = null;

function getOpenAI(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OpenAI API key is required. Set OPENAI_API_KEY in your .env.local file " +
      "or pass it when calling the API route."
    );
  }

  if (!cachedOpenAI || cachedOpenAI.apiKey !== key) {
    cachedOpenAI = new OpenAI({ apiKey: key });
  }
  return cachedOpenAI;
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
  }
): Promise<string> {
  const openai = getOpenAI(options?.apiKey);

  const completion = await openai.chat.completions.create({
    model: options?.model ?? "gpt-4o-mini",
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}
