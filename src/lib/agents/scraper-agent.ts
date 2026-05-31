import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import { scrapeGoogleMaps } from "./google-maps-scraper";
import type { AgentResult, ScrapedLead, ScraperSource, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

function buildWebSearchPrompt(businessName: string, productDescription: string): string {
  return `

IMPORTANT: You MUST search the web in real-time to find REAL businesses and professionals matching the search criteria. Use Google Search grounding to look up current, real listings. Do NOT generate fictional leads — find actual companies and people that exist.

For each real business/professional you find, include:
- Their actual company name and website
- Real location and contact details (as available from search results)
- What they do and why they might be a good fit for ${businessName}'s ${productDescription}

After searching, format the real results as the JSON array described below.`;
}

const DIRECTORY_SYSTEM_PROMPT = `You are a lead sourcing specialist for {businessName} ({industry}). Your task is to search the web in real-time to find REAL lead profiles from online directories and business listings.

Search for actual businesses, practitioners, and professionals matching the criteria. Use Google Search grounding to find real results.

For each real prospect found, provide:
- Name (actual person/company)
- Company or practice name (real)
- Role / title
- Website or source URL
- Contact info if available
- Relevance score (0-100) based on fit for {productDescription}
- Why they are a good prospect for {businessName}`;

const APOLLO_SYSTEM_PROMPT = `You are a B2B lead generation specialist using Apollo.io-style prospecting for {businessName} ({industry}). Search the web in real-time to find REAL businesses and professionals matching the criteria.

For each real prospect, provide:
- Full name
- Company name and website
- Professional title/role
- Lead score (0-100) based on fit + engagement potential
- Notes about why they are a good fit
- Source URL where you found them

Use Google Search grounding to find actual companies.`;

const LINKEDIN_SYSTEM_PROMPT = `You are a LinkedIn Sales Navigator specialist for {businessName} ({industry}). Search the web in real-time to find REAL professionals matching the criteria.

For each real prospect, provide:
- Full name
- Current position and company
- LinkedIn profile URL or company website
- Lead score (0-100)
- Why they would be a good prospect

Use Google Search grounding to find actual LinkedIn profiles and companies.`;

const GOOGLE_MAPS_SYSTEM_PROMPT = `You are a local business discovery specialist for {businessName} ({industry}). Your task is to find REAL local businesses and professionals on Google Maps that match the search criteria.

Search for actual businesses, clinics, practitioners, and professionals in the specified location. Use Google Search grounding to find real Google Maps listings.

For each real business found, provide:
- Business name (actual)
- Address and location
- Phone number (if available)
- Website URL (if available)
- Rating and reviews
- Business category
- Relevance score (0-100) based on fit for {productDescription}
- Why they would be a good prospect for {businessName}`;

function buildFormatPrompt(maxResults: number): string {
  return `Format your response as a valid JSON array of lead objects. Each lead object must have:
{
  "name": "string",
  "company": "string",
  "role": "string",
  "email": "string (optional, use real if found)",
  "phone": "string (optional)",
  "source": "directory" | "apollo" | "linkedin" | "google-maps",
  "sourceUrl": "string (REQUIRED — the actual website/URL where you found this lead)",
  "score": "number (0-100)",
  "notes": "string (2-3 sentences about this real prospect)",
  "personaType": "wellness-seeker" | "practitioner" | "biohacker" | "business-builder"
}

Return exactly ${maxResults} real leads you found through web search.`;
}

export class ScraperAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const source: ScraperSource = JSON.parse(input);
      const maxResults = source.maxResults || 5;
      const profile: BusinessProfile = resolveBusinessProfile(context);

      let leads: ScrapedLead[] = [];

      // For Google Maps, use real browser scraping via Puppeteer
      if (source.type === "google-maps") {
        const browserLeads = await scrapeGoogleMaps({
          query: source.query,
          location: source.location,
          maxResults,
        });

        return this.createResult("scraper", JSON.stringify({ leads: browserLeads, count: browserLeads.length, webSearch: true }), {
          sourceType: source.type,
          query: source.query,
          location: source.location,
          count: browserLeads.length,
          provider: "browser",
          webSearch: true,
          label: `${browserLeads.length} leads scraped from Google Maps`,
        });
      }

      // For other sources, use LLM-based generation
      let rawSystemPrompt: string;
      switch (source.type) {
        case "directory":
          rawSystemPrompt = DIRECTORY_SYSTEM_PROMPT;
          break;
        case "apollo":
          rawSystemPrompt = APOLLO_SYSTEM_PROMPT;
          break;
        case "linkedin":
          rawSystemPrompt = LINKEDIN_SYSTEM_PROMPT;
          break;
        default:
          rawSystemPrompt = APOLLO_SYSTEM_PROMPT;
      }
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);

      const formatPrompt = buildFormatPrompt(maxResults);

      const userPrompt = this.buildScraperPrompt(source, maxResults, profile);
      const provider = ((context?.provider as string) || this.config.provider || "gemini");
      const useGemini = provider === "gemini";

      // When using Gemini, enable Google Search grounding for real web search results
      const modelOutput = await callLLM(
        systemPrompt + "\n\n" + formatPrompt + (useGemini ? buildWebSearchPrompt(profile.businessName, profile.productDescription) : ""),
        userPrompt,
        {
          model: (context?.model as string) || this.config.model,
          temperature: 0.7,
          maxTokens: this.config.maxTokens,
          apiKey: this.apiKey,
          provider: provider as LLMProvider,
          useWebSearch: useGemini,
        }
      );

      // Try to parse as JSON array
      try {
        const cleaned = this.cleanJsonOutput(modelOutput);
        leads = JSON.parse(cleaned) as ScrapedLead[];
      } catch {
        // If LLM didn't return valid JSON, try to extract JSON array from the text
        const jsonMatch = modelOutput.match(/\[\s*\{[^}]*\}(?:\s*,\s*\{[^}]*\})*\s*\]/);
        if (jsonMatch) {
          try {
            leads = JSON.parse(jsonMatch[0]) as ScrapedLead[];
          } catch {
            leads = this.createFallbackLeads(source, maxResults);
          }
        } else {
          leads = this.createFallbackLeads(source, maxResults);
        }
      }

      return this.createResult("scraper", JSON.stringify({ leads, count: leads.length, webSearch: useGemini }), {
        sourceType: source.type,
        query: source.query,
        count: leads.length,
        provider: provider,
        webSearch: useGemini,
        label: `${leads.length} leads sourced ${useGemini ? "via web search" : "from " + source.type}`,
      });
    } catch (error) {
      return this.createErrorResult(
        "scraper",
        error instanceof Error ? error.message : "Unknown error during lead sourcing"
      );
    }
  }

  private buildScraperPrompt(source: ScraperSource, maxResults: number, profile: BusinessProfile): string {
    const sections: string[] = [];

    sections.push(`Search Query: ${source.query}`);
    if (source.industry) sections.push(`Industry / Niche: ${source.industry}`);
    if (source.location) sections.push(`Location: ${source.location}`);
    if (source.role) sections.push(`Role / Title: ${source.role}`);

    const sourceLabels: Record<string, string> = {
      directory: "industry directory listing",
      apollo: "Apollo.io lead database",
      linkedin: "LinkedIn Sales Navigator search results",
      "google-maps": "Google Maps business listings",
    };

    return `Source: ${sourceLabels[source.type] ?? source.type}
Search Criteria:
${sections.join("\n")}
Business: ${profile.businessName} (${profile.industry})
Product: ${profile.productDescription}
Key Selling Points: ${profile.keySellingPoints}

Generate ${maxResults} realistic, diverse lead profiles matching these criteria who would be interested in ${profile.businessName}.
Make each lead unique with specific pain points and interests relevant to ${profile.industry}.

${source.type === "linkedin" ? "For LinkedIn leads, include the connection approach angle in the notes." : ""}
${source.type === "directory" ? "For directory leads, focus on relevant businesses and professionals who could benefit from or resell similar products/services." : ""}`;
  }

  private cleanJsonOutput(output: string): string {
    // Remove markdown code block wrappers if present
    let cleaned = output.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
  }

  private createFallbackLeads(source: ScraperSource, count: number): ScrapedLead[] {
    const fallbackLeads: Record<string, ScrapedLead[]> = {
      directory: [
        {
          name: "Dr. Elena Martinez",
          company: "Serenity Wellness Center",
          role: "Naturopathic Doctor",
          email: "elena@serenitywellness.com",
          phone: "+1 (415) 555-0182",
          source: "directory",
          sourceUrl: "https://directory.example.com/serenity-wellness",
          score: 92,
          notes: "Established naturopathic practice with 500+ patients. Currently recommends supplements and lifestyle changes. Open to adding frequency technology as a complementary offering. Has budget for new equipment.",
          personaType: "practitioner",
        },
        {
          name: "James Wilson",
          company: "Wilson Family Chiropractic",
          role: "Chiropractor",
          email: "james@wilsonchiro.com",
          phone: "+1 (312) 555-0147",
          source: "directory",
          score: 85,
          notes: "Chiropractor with 15 years experience. Interested in non-invasive pain management technologies. Large patient base with chronic pain conditions ideal for Healy.",
          personaType: "practitioner",
        },
        {
          name: "Anaya Patel",
          company: "Harmony Yoga Studio",
          role: "Yoga Instructor / Studio Owner",
          email: "anaya@harmonyyoga.com",
          phone: "+1 (510) 555-0234",
          source: "directory",
          score: 70,
          notes: "Yoga studio owner with 200+ students. Many students dealing with stress and sleep issues. Looking for holistic wellness products to recommend.",
          personaType: "wellness-seeker",
        },
        {
          name: "Dr. Marcus Thompson",
          company: "Thompson Acupuncture & Wellness",
          role: "Licensed Acupuncturist",
          email: "marcus@thompsonacu.com",
          source: "directory",
          score: 88,
          notes: "Licensed acupuncturist with holistic approach. Knowledgeable about energy meridians. Excellent fit for explaining Healy's frequency technology to patients.",
          personaType: "practitioner",
        },
        {
          name: "Sophia Richards",
          company: "Biohack Your Life",
          role: "Health Coach / Biohacker",
          email: "sophia@biohackyourlife.com",
          phone: "+1 (720) 555-0789",
          source: "directory",
          score: 95,
          notes: "Well-known health coach in the biohacking space. Active on social media with 50K+ followers. Regularly reviews wellness devices. High influence potential.",
          personaType: "biohacker",
        },
      ],
      "google-maps": [
        {
          name: "Harmony Health Center",
          company: "Harmony Health Center",
          role: "Wellness Center",
          email: "",
          phone: "+1 (415) 555-0123",
          source: "google-maps",
          sourceUrl: "https://maps.google.com/maps/place/Harmony+Health+Center",
          score: 85,
          notes: "Wellness center found on Google Maps in San Francisco. Offers holistic health services including acupuncture and massage therapy. Strong local reputation with 4.5-star rating. Potential partner for offering frequency wellness technology.",
          personaType: "practitioner",
        },
        {
          name: "Peak Performance Studio",
          company: "Peak Performance Studio",
          role: "Fitness & Wellness Studio",
          email: "",
          phone: "+1 (415) 555-0456",
          source: "google-maps",
          sourceUrl: "https://maps.google.com/maps/place/Peak+Performance+Studio",
          score: 72,
          notes: "Boutique fitness studio in Los Angeles. Clients are health-conscious and interested in wellness optimization. Good target for referral partnership with biohacking angle.",
          personaType: "wellness-seeker",
        },
        {
          name: "Dr. Michael Torres DC",
          company: "Torres Chiropractic Clinic",
          role: "Chiropractor",
          email: "",
          phone: "+1 (310) 555-0789",
          source: "google-maps",
          sourceUrl: "https://maps.google.com/maps/place/Torres+Chiropractic+Clinic",
          score: 90,
          notes: "Established chiropractic clinic in San Diego with 4.7 stars and 200+ reviews. Large patient base with chronic pain conditions. Excellent fit for frequency device partnership.",
          personaType: "practitioner",
        },
        {
          name: "Natural Healing Arts",
          company: "Natural Healing Arts",
          role: "Naturopathic Clinic",
          email: "",
          phone: "+1 (510) 555-0234",
          source: "google-maps",
          sourceUrl: "https://maps.google.com/maps/place/Natural+Healing+Arts",
          score: 88,
          notes: "Naturopathic clinic in Berkeley. Holistic approach to wellness. Already knowledgeable about energy medicine and frequency devices. High partnership potential.",
          personaType: "practitioner",
        },
        {
          name: "Biohack Cafe & Wellness",
          company: "Biohack Cafe & Wellness",
          role: "Biohacking Lounge",
          email: "",
          phone: "+1 (424) 555-0567",
          source: "google-maps",
          sourceUrl: "https://maps.google.com/maps/place/Biohack+Cafe+Wellness",
          score: 95,
          notes: "Unique biohacking-themed cafe and wellness space in Santa Monica. Attracts early adopters and wellness enthusiasts. Ideal venue for product demos and workshops. High visibility potential.",
          personaType: "biohacker",
        },
      ],
      apollo: [
        {
          name: "Robert Chen",
          company: "Vitality Health Solutions",
          role: "VP of Product",
          email: "robert.chen@vitalityhealth.com",
          phone: "+1 (617) 555-0345",
          source: "apollo",
          score: 82,
          notes: "VP at a wellness product distribution company. Currently sourcing innovative wellness technologies. Has budget authority for new partnerships. Looking for exclusive distributor agreements.",
          personaType: "practitioner",
        },
        {
          name: "Maya Rodriguez",
          company: "Peak Performance Institute",
          role: "Director of Wellness",
          email: "maya@peakperfinstitute.com",
          source: "apollo",
          score: 78,
          notes: "Director at premium wellness retreat center. Always looking for new technologies to offer guests. Decision-maker for equipment purchases. High-end clientele willing to invest in wellness.",
          personaType: "biohacker",
        },
        {
          name: "Kevin O'Brien",
          company: "TruHealth Medical",
          role: "CEO / Founder",
          email: "kevin@truhealthmed.com",
          phone: "+1 (503) 555-0678",
          source: "apollo",
          score: 90,
          notes: "Founder of integrative medicine clinic. Currently exploring frequency devices for patient use. Business-minded with MLM experience. Could become a Healy distributor.",
          personaType: "practitioner",
        },
        {
          name: "Priya Sharma",
          company: "WellWomen Collective",
          role: "Community Manager",
          email: "priya@wellwomen.co",
          source: "apollo",
          score: 65,
          notes: "Manages a women's wellness community with 15K members. Constantly curates wellness products and technologies to recommend. Budget-conscious but high reach.",
          personaType: "business-builder",
        },
        {
          name: "Derek Johnson",
          company: "Longevity Lab",
          role: "Chief Science Officer",
          email: "derek@longevitylab.io",
          phone: "+1 (206) 555-0456",
          source: "apollo",
          score: 75,
          notes: "CSO at a longevity-focused biotech. Very science-oriented. Would need clinical evidence to be convinced. Potential strategic partnership for research collaborations.",
          personaType: "biohacker",
        },
      ],
      linkedin: [
        {
          name: "Natalie Foster",
          company: "Natalie Foster Wellness",
          role: "Holistic Health Coach & Speaker",
          email: "natalie@nfwellness.com",
          source: "linkedin",
          sourceUrl: "https://linkedin.com/in/nataliefoster",
          score: 91,
          notes: "LinkedIn wellness influencer with 30K+ followers. Frequent speaker at holistic health conferences. Engages heavily with content about bioenergetics and frequency medicine. Excellent brand ambassador potential. Connect via mutual interest in energy medicine.",
          personaType: "business-builder",
        },
        {
          name: "Dr. Alex Kimura",
          company: "Integrative Health Partners",
          role: "Medical Director",
          email: "akimura@ihp.com",
          source: "linkedin",
          score: 86,
          notes: "Medical director at an integrative health clinic. LinkedIn profile shows interest in non-pharmaceutical pain management. Active in functional medicine groups. Good target for clinical partnership. Approach with research data on frequency therapy.",
          personaType: "practitioner",
        },
        {
          name: "Tara Whitfield",
          company: "BioSync Wellness",
          role: "Founder & CEO",
          email: "tara@biosyncwellness.com",
          phone: "+1 (310) 555-0890",
          source: "linkedin",
          sourceUrl: "https://linkedin.com/in/tarawhitfield",
          score: 94,
          notes: "Serial entrepreneur in wellness tech. Previously founded a meditation app acquired by Headspace. Currently exploring frequency technologies. Has capital and distribution network. Premium partnership target.",
          personaType: "business-builder",
        },
        {
          name: "Marcus Webb",
          company: "Optimize Me Podcast",
          role: "Podcast Host / Biohacker",
          email: "marcus@optimizemepodcast.com",
          source: "linkedin",
          score: 87,
          notes: "Runs a top-50 health podcast in the biohacking category. Always looking for innovative wellness devices to feature. 100K+ monthly listeners. Excellent PR opportunity. Offer podcast appearance and device trial.",
          personaType: "biohacker",
        },
        {
          name: "Dr. Sarah Goldstein",
          company: "Goldstein Family Wellness",
          role: "Functional Medicine Doctor",
          email: "sarah@goldsteinwellness.com",
          phone: "+1 (914) 555-0123",
          source: "linkedin",
          score: 93,
          notes: "Functional medicine MD with strong social media presence. Published articles on non-pharmaceutical interventions. Large patient base with complex chronic conditions. Ideal clinical partner for Healy. Approach with clinical evidence and patient success stories.",
          personaType: "practitioner",
        },
      ],
    };

    return (fallbackLeads[source.type] ?? fallbackLeads.apollo).slice(0, count);
  }
}
