import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, ContentBrief, ContentResult, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const SYSTEM_PROMPTS: Record<string, string> = {
  blog: `You are an expert content writer for {businessName} in the {industry} space. Create educational, trust-building blog content that:

- Explains {productDescription} in simple, relatable terms
- Uses analogies and metaphors to make complex concepts accessible
- Highlights specific benefits aligned with {keySellingPoints}
- References user testimonials and experiences (without making unsubstantiated claims)
- Optimizes for SEO with natural keywords
- Ends with an educational CTA aligned with {businessName}'s offerings
- Targets {targetAudience}
- Builds authority and trust
- Addresses common objections skeptically but respectfully
- Tone: {brandVoice}`,

  social: `You are a social media content creator for {businessName} ({industry}). Create engaging posts that:

- Open with a hook that stops the scroll (question, stat, pain point)
- Are concise and shareable (LinkedIn, Instagram, Facebook)
- Use power words aligned with the brand voice: {brandVoice}
- Include relevant hashtags
- Feature customer transformation stories when possible
- Drive actions: comment, share, DM, click link
- Post types: educational, testimonial, myth-busting, lifestyle, Q&A
- Maintain warm, authentic, community-focused voice
- Never make unsubstantiated claims`,

  email: `You are an expert email marketer for {businessName} ({industry}). Create email sequences that:

- Nurture prospects who have shown interest
- Educate step-by-step about the value and benefits
- Share real customer stories and testimonials
- Build trust through educational value before any pitch
- Include clear, low-friction CTAs
- Follow a proven nurture sequence: education → social proof → offer
- Personalize based on the prospect's specific interests
- End each email with a conversation starter, not a hard sell
- Respect inbox with valuable content, not promotional noise`,

  landing: `You are a conversion copywriter for {businessName} ({industry}). Create landing pages that:

- Have a compelling, benefit-driven headline
- Clearly communicate the value proposition in under 5 seconds
- Address the prospect's pain points immediately
- Use bullet points for key benefits (not features)
- Include testimonial snippets and social proof
- Have a single, clear CTA
- Address objections proactively
- Create urgency without pressure
- Feel warm, supportive, and educational not salesy
- Tone: {brandVoice}`,

  ad: `You are an advertising copywriter for {businessName} ({industry}). Create ad copy that:

- Grabs attention with a relatable pain point
- Hooks with curiosity
- Highlights key differentiator: {keySellingPoints}
- Uses power words aligned with {brandVoice}
- Includes social proof or result indicators
- Has a clear, low-friction CTA
- Is platform-appropriate (Facebook, Instagram, Google, TikTok)
- Tests emotional vs. educational angles
- Respects ad platform guidelines`,
};

export class ContentAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      let brief: ContentBrief;
      if (context?.brief) {
        brief = context.brief as ContentBrief;
      } else {
        brief = JSON.parse(input) as ContentBrief;
      }
      const profile: BusinessProfile = resolveBusinessProfile(context);

      const rawSystemPrompt = SYSTEM_PROMPTS[brief.contentType] ?? SYSTEM_PROMPTS.blog;
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);
      const contentTypeLabel = this.getContentTypeLabel(brief.contentType);

      const userPrompt = this.buildPrompt(brief, profile);
      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      const content: ContentResult = {
        title: this.extractTitle(modelOutput, brief.topic),
        body: modelOutput,
        excerpt: this.extractExcerpt(modelOutput),
        seoKeywords: brief.keywords ?? [],
        contentType: brief.contentType,
        estimatedReadTime: Math.ceil(modelOutput.split(" ").length / 200),
        generatedAt: new Date(),
      };

      return this.createResult("content", JSON.stringify(content), {
        contentType: brief.contentType,
        topic: brief.topic,
        label: contentTypeLabel,
      });
    } catch (error) {
      return this.createErrorResult(
        "content",
        error instanceof Error ? error.message : "Unknown error generating content"
      );
    }
  }

  private getContentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      blog: "Wellness Blog Post",
      social: "Social Media Post",
      email: "Nurture Email",
      landing: "Landing Page",
      ad: "Ad Copy",
    };
    return labels[type] ?? "Wellness Content";
  }

  private buildPrompt(brief: ContentBrief, profile: BusinessProfile): string {
    return `Create a ${brief.contentType} content piece for ${profile.businessName} (${profile.industry}) with the following details:

Topic: ${brief.topic}
Target Audience: ${brief.targetAudience}
Tone: ${brief.tone ?? profile.brandVoice}
Length: ${brief.length ?? "medium"}
${brief.keywords?.length ? `Keywords to include: ${brief.keywords.join(", ")}` : ""}
${brief.callToAction ? `Call to Action: ${brief.callToAction}` : ""}

Key Points to Cover:
${brief.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join("\n")}

Format the content professionally with clear sections.
Remember: This is for ${profile.businessName} - ${profile.productDescription}.
Key selling points: ${profile.keySellingPoints}.
Never make unsubstantiated claims — always position appropriately.
Brand voice: ${profile.brandVoice}`;
  }

  private extractTitle(output: string, fallback: string): string {
    const lines = output.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
        return trimmed.replace(/^#+ /, "");
      }
    }
    return fallback;
  }

  private extractExcerpt(output: string): string {
    const cleaned = output
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return cleaned.split("\n\n")[0]?.slice(0, 200) ?? "";
  }
}
