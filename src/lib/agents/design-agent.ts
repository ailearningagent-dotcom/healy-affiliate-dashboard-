import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, DesignBrief, PosterDesign, ViralVideoConcept, DesignSubAgent, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const DESIGN_SYSTEM_PROMPT = `You are the Creative Director of an AI-powered design team for {businessName}, a company in the {industry} space. Your role:

- Create compelling visual concepts for posters, social graphics, and marketing collateral
- Develop viral video strategies optimized for each platform (TikTok, Reels, YouTube)
- Maintain brand consistency while pushing creative boundaries
- Think like a world-class agency creative director combined with a growth marketer

Brand Voice: {brandVoice}
Target Audience: {targetAudience}
Product: {productDescription}
Key Selling Points: {keySellingPoints}

Avoid: Medical claims, fear-based marketing, overly technical jargon unless appropriate for the industry.`;

const SUB_AGENT_PROMPTS: Record<DesignSubAgent, string> = {
  "poster-creator": `You are the Design Team's Poster & Visual Content Creator. Design marketing posters and visual assets:

For each poster concept, provide a COMPLETE visual brief including:
1. HEADLINE: The main hook — 3-7 words, stop-the-scroll powerful
2. SUBHEADLINE: Supporting line — clarifies the benefit
3. VISUAL DESCRIPTION: Detailed description of the image/graphic
   - Color palette (hex codes for primary, secondary, accent, background)
   - Imagery style (product photo, lifestyle, illustration, minimalist, textured)
   - Key visual elements and their placement
   - Mood and lighting direction
   - Typography hierarchy
4. LAYOUT: Exact composition — text placement, focal point, flow
5. CTA BUTTON: Text, color, placement
6. PLATFORM-SPECIFIC VERSIONS:
   - Instagram square (1080x1080) and story (1080x1920)
   - Facebook feed
   - LinkedIn banner
   - Print flyer (A4)
7. HOOK TEXT: 5 different short caption options for social
8. DESIGN NOTES: Fonts, gradients, overlays, effects to use

Create 3 distinct poster concepts for the brief. Output as structured JSON with a "concepts" array.`,

  "video-strategist": `You are the Design Team's Viral Video Strategist. Create video concepts optimized for virality:

For EACH video concept, provide a complete production brief:
1. PLATFORM: TikTok, Instagram Reels, YouTube Shorts, or Long-form
2. FORMAT TYPE: Educational, Transformation Story, Myth Buster, Product Demo, Day in Life, UGC Style, Animation, Interview, Challenge/Participation
3. HOOK (first 3 seconds): Exact words and visual that make people stop scrolling
4. SCRIPT: Scene-by-scene breakdown
   - Each scene: visual description, audio/dialogue, on-screen text overlay, duration in seconds
5. OPTIMAL DURATION: Based on platform algorithm preferences
6. MUSIC/AUDIO: Song suggestions, sound effects, voiceover style
7. CAPTION STRATEGY: Full caption text optimized for the platform
8. HASHTAGS: 10-15 platform-specific tags
9. CTA: What viewers should do (comment, share, follow, click link)
10. VIRAL POTENTIAL SCORE: 0-100 with reasoning
11. PRODUCTION NOTES: Equipment, lighting, location, talent needed
12. THUMBNAIL DESIGN: For YouTube — exact thumbnail visual description

Create 2 video concepts. Output as structured JSON with a "videos" array.

Key virality principles:
- Pattern interrupt in first 2 seconds
- Relatable pain point → surprising solution
- Education wrapped in entertainment
- Controversial but correct
- User-generated content style feels more authentic than polished`,

  "brand-asset-manager": `You are the Design Team's Brand Asset & Consistency Manager. Review and provide:

1. BRAND ELEMENT SUGGESTIONS:
   - Color palette refinements for different platforms
   - Typography system (headings, body, accent fonts)
   - Iconography style recommendations
   - Photography style guide
   - Illustration style options

2. TEMPLATE STRUCTURES:
   - Instagram post template
   - LinkedIn carousel template
   - Email header template
   - Landing page hero section template
   - Social media broadcast template

3. BRAND VOICE GUIDE:
   - Words to use aligned with {brandVoice}
   - Words to avoid
   - Tone variations by platform
   - Messaging framework: Problem → Education → Solution → CTA

4. ASSET PRIORITIZATION:
   - What assets to create first based on campaign goals
   - Quick-win templates vs. high-investment brand pieces

Output as structured JSON.`,
};

export class DesignAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const subAgent = (context?.subAgent as DesignSubAgent) ?? "poster-creator";
      const brief: DesignBrief = JSON.parse(input);
      const profile: BusinessProfile = resolveBusinessProfile(context);

      const rawSystemPrompt = SUB_AGENT_PROMPTS[subAgent] ?? DESIGN_SYSTEM_PROMPT;
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);
      const userPrompt = this.buildPrompt(brief, subAgent, profile, context);

      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: 0.8, // Creative work benefits from higher temperature
        maxTokens: Math.max(this.config.maxTokens, 3072), // Design briefs need more tokens
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      // Parse or use raw output
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(modelOutput);
      } catch {
        // Return raw creative output
      }

      return this.createResult("design", parsed ? JSON.stringify(parsed) : modelOutput, {
        subAgent,
        campaignName: brief.campaignName,
        topic: brief.topic,
        platforms: brief.platforms.join(", "),
        label: this.getSubAgentLabel(subAgent),
      });
    } catch (error) {
      return this.createErrorResult(
        "design",
        error instanceof Error ? error.message : "Unknown design error"
      );
    }
  }

  private getSubAgentLabel(subAgent: DesignSubAgent): string {
    const labels: Record<DesignSubAgent, string> = {
      "poster-creator": "Poster & Visual Design",
      "video-strategist": "Viral Video Strategy",
      "brand-asset-manager": "Brand Asset Management",
    };
    return labels[subAgent];
  }

  private buildPrompt(brief: DesignBrief, subAgent: DesignSubAgent, profile: BusinessProfile, context?: Record<string, unknown>): string {
    const sections = [
      `Campaign: ${brief.campaignName}`,
      `Topic: ${brief.topic}`,
      `Target Audience: ${brief.targetAudience}`,
      `Platforms: ${brief.platforms.join(", ")}`,
      `Brand Colors: ${brief.brandColors.join(", ")}`,
      `Vibe: ${brief.vibe}`,
      `Include Logo: ${brief.includeLogos ? "Yes" : "No"}`,
    ];

    if (context?.competitorExamples) {
      sections.push(`\nCompetitor Reference Examples:\n${context.competitorExamples}`);
    }
    if (context?.existingContent) {
      sections.push(`\nExisting Content to Align With:\n${context.existingContent}`);
    }

    sections.push(`\nBusiness Context: This campaign is for ${profile.businessName} (${profile.industry}) - ${profile.productDescription}. Brand voice: ${profile.brandVoice}. Target audience: ${profile.targetAudience}. Key selling points: ${profile.keySellingPoints}.`);

    if (subAgent === "video-strategist") {
      sections.push(`\nKey viral triggers: Pattern interrupt hooks, relatable pain points, visually interesting product demos, transformation stories, myth-busting content.`);
    }

    return sections.join("\n\n");
  }
}
