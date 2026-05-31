"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  TrendingUp,
  Crown,
  DollarSign,
  Search,
  Palette,
  Code2,
  Mail,
  Globe,
  BarChart3,
  Play,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Code,
  Activity,
  Zap,
  DollarSign as DollarIcon,
} from "lucide-react";
import clsx from "clsx";

// ============ TYPES ============

interface FormField {
  key: string;
  label: string;
  type: "text" | "select" | "textarea" | "number";
  placeholder?: string;
  options?: string[];
  default?: string | number;
}

interface AgentFormConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  gradient: string;
  fields: FormField[];
}

// ============ AGENT CONFIGURATIONS ============

const AGENT_FORM_CONFIGS: AgentFormConfig[] = [
  {
    id: "content", name: "Content Creator", description: "Generate blog posts, social content, emails, landing pages, and ad copy",
    icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", gradient: "from-emerald-500 to-emerald-600",
    fields: [
      { key: "topic", label: "Topic", type: "text", placeholder: "e.g., Frequency wellness benefits", default: "Microcurrent Therapy for Daily Wellness" },
      { key: "contentType", label: "Content Type", type: "select", options: ["blog", "social", "email", "landing", "ad"], default: "blog" },
      { key: "targetAudience", label: "Target Audience", type: "text", placeholder: "e.g., Wellness enthusiasts", default: "Wellness seekers and health practitioners" },
      { key: "tone", label: "Tone", type: "select", options: ["Educational", "Inspirational", "Professional", "Friendly", "Scientific"], default: "Educational" },
      { key: "keyPoints", label: "Key Points", type: "textarea", placeholder: "One per line", default: "Non-invasive wellness support\nPersonalized frequencies\nBacked by research" },
    ],
  },
  {
    id: "sales", name: "Sales Team", description: "Qualify leads, personalize outreach, and design follow-up cadences",
    icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", gradient: "from-amber-500 to-orange-600",
    fields: [
      { key: "leadName", label: "Lead Name", type: "text", placeholder: "Full name", default: "Dr. Sarah Chen" },
      { key: "leadCompany", label: "Company", type: "text", placeholder: "Company or practice", default: "Holistic Health NYC" },
      { key: "leadRole", label: "Role", type: "text", placeholder: "Job title", default: "Clinic Director & Naturopath" },
      { key: "personaType", label: "Persona Type", type: "select", options: ["wellness-seeker", "practitioner", "biohacker", "business-builder"], default: "practitioner" },
      { key: "channel", label: "Channel", type: "select", options: ["email", "whatsapp", "linkedin", "phone"], default: "email" },
      { key: "urgency", label: "Urgency", type: "select", options: ["hot", "warm", "cold"], default: "warm" },
    ],
  },
  {
    id: "ceo", name: "CEO Strategist", description: "Strategic planning, task prioritization, and cross-department orchestration",
    icon: Crown, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", gradient: "from-purple-500 to-violet-600",
    fields: [
      { key: "goal", label: "Business Goal", type: "textarea", placeholder: "What do you want to achieve?", default: "Generate 50 qualified leads and book 15 consultations for Q3 wellness product launch" },
      { key: "timeframe", label: "Timeframe", type: "text", placeholder: "e.g., 3 months", default: "3 months (Q3 2026)" },
      { key: "priority", label: "Priority", type: "select", options: ["critical", "high", "medium", "low"], default: "high" },
      { key: "targetOutcome", label: "Target Outcome", type: "textarea", placeholder: "Desired result", default: "Establish market presence in NYC wellness community with measurable pipeline" },
    ],
  },
  {
    id: "cfo", name: "CFO Analyst", description: "Budget planning, ROI analysis, and cost-per-lead optimization",
    icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", gradient: "from-emerald-500 to-teal-600",
    fields: [
      { key: "campaignName", label: "Campaign Name", type: "text", placeholder: "e.g., Q3 Wellness Launch", default: "Q3 Wellness Product Launch" },
      { key: "budget", label: "Budget ($)", type: "number", placeholder: "Total budget", default: 15000 },
      { key: "durationDays", label: "Duration (days)", type: "number", placeholder: "Campaign length", default: 90 },
      { key: "channels", label: "Channels", type: "select", options: ["Email + Social + Content", "Social + Paid Ads", "Content + Outreach", "All Channels"], default: "Email + Social + Content" },
    ],
  },
  {
    id: "research", name: "Prospect Researcher", description: "Analyze prospects and assess fit for your business",
    icon: Search, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", gradient: "from-violet-500 to-purple-600",
    fields: [
      { key: "targetName", label: "Target / Company", type: "text", placeholder: "Name or company", default: "Integrative Health Partners" },
      { key: "industry", label: "Industry", type: "text", placeholder: "e.g., Holistic medicine", default: "Integrative & Functional Medicine" },
      { key: "role", label: "Role to Research", type: "text", placeholder: "e.g., Medical Director", default: "Medical Director & Lead Practitioner" },
      { key: "location", label: "Location", type: "text", placeholder: "City or region", default: "San Francisco Bay Area" },
    ],
  },
  {
    id: "design", name: "Design Team", description: "Poster concepts, video strategies, and brand asset management",
    icon: Palette, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/20", gradient: "from-pink-500 to-rose-600",
    fields: [
      { key: "campaignName", label: "Campaign Name", type: "text", placeholder: "e.g., Wellness Summit", default: "Summer Wellness Campaign" },
      { key: "topic", label: "Topic", type: "text", placeholder: "What's the focus?", default: "Frequency Technology for Stress Relief" },
      { key: "vibe", label: "Vibe", type: "select", options: ["professional", "educational", "emotional", "trendy", "minimalist"], default: "educational" },
      { key: "platforms", label: "Platforms", type: "select", options: ["Instagram + Facebook", "LinkedIn + Twitter", "TikTok + Reels", "All Platforms"], default: "Instagram + Facebook" },
    ],
  },
  {
    id: "developer", name: "AI Developer", description: "Auto-fix errors, review code, manage dependencies, and monitor app health",
    icon: Code2, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20", gradient: "from-cyan-500 to-blue-600",
    fields: [
      { key: "issueType", label: "Issue Type", type: "select", options: ["Error Fixing", "Code Review", "Dependency Audit", "Health Check"], default: "Error Fixing" },
      { key: "specificIssue", label: "Description", type: "textarea", placeholder: "Describe the issue", default: "TypeScript compilation error: Property 'user' does not exist on type 'Session'" },
      { key: "projectType", label: "Project Type", type: "text", placeholder: "e.g., Next.js", default: "Next.js 16 + TypeScript" },
    ],
  },
  {
    id: "outreach", name: "Consultation Booker", description: "Generate personalized outreach messages and book consultations",
    icon: Mail, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", gradient: "from-blue-500 to-cyan-600",
    fields: [
      { key: "prospectName", label: "Prospect Name", type: "text", placeholder: "Full name", default: "Dr. Marcus Thompson" },
      { key: "personaType", label: "Persona Type", type: "select", options: ["wellness-seeker", "practitioner", "biohacker", "business-builder"], default: "practitioner" },
      { key: "channel", label: "Channel", type: "select", options: ["email", "whatsapp", "linkedin", "phone"], default: "email" },
      { key: "tone", label: "Tone", type: "select", options: ["professional", "friendly", "warm", "casual"], default: "warm" },
    ],
  },
  {
    id: "scraper", name: "Lead Scraper", description: "Source high-quality prospect leads from directories and web sources",
    icon: Globe, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", gradient: "from-indigo-500 to-violet-600",
    fields: [
      { key: "query", label: "Search Query", type: "text", placeholder: "e.g., Holistic wellness centers", default: "Holistic wellness practitioners New York" },
      { key: "industry", label: "Industry", type: "text", placeholder: "e.g., Wellness", default: "Holistic & Integrative Medicine" },
      { key: "location", label: "Location", type: "text", placeholder: "City or region", default: "New York City" },
      { key: "maxResults", label: "Max Results", type: "number", placeholder: "How many leads?", default: 5 },
    ],
  },
  {
    id: "analyst", name: "Data Analyst", description: "Market intelligence, lead enrichment, and web sourcing",
    icon: BarChart3, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", gradient: "from-blue-500 to-indigo-600",
    fields: [
      { key: "targetMarket", label: "Target Market", type: "text", placeholder: "e.g., Wellness professionals", default: "Holistic health practitioners in NYC" },
      { key: "analysisType", label: "Analysis Type", type: "select", options: ["Market Intelligence", "Lead Enrichment", "Competitor Research"], default: "Market Intelligence" },
      { key: "location", label: "Location", type: "text", placeholder: "City", default: "New York City" },
      { key: "maxLeads", label: "Max Leads", type: "number", placeholder: "Target count", default: 10 },
    ],
  },
];

// ============ MOCK RESULTS ============

const MOCK_RESULTS: Record<string, string> = {
  content: `{
  "title": "Understanding Microcurrent Therapy for Daily Wellness",
  "contentType": "blog",
  "excerpt": "Discover how personalized microcurrent frequencies can support your body's natural healing processes and enhance your daily wellness routine.",
  "body": "# Understanding Microcurrent Therapy for Daily Wellness\\n\\nIn the quest for optimal health, many are turning to innovative technologies that work with the body's natural systems. Microcurrent frequency therapy represents a fascinating intersection of ancient wellness principles and modern technology.\\n\\n## What Is Microcurrent Therapy?\\n\\nMicrocurrent therapy uses low-level electrical currents that mirror the body's own bioelectrical signals. Unlike TENS units that deliver strong pulses, microcurrent devices work at a cellular level, supporting the body's natural healing processes.\\n\\n## Key Benefits\\n\\n- **Non-invasive wellness support** - no drugs, no side effects\\n- **Personalized frequencies** tailored to individual needs\\n- **Daily 15-minute sessions** that fit any schedule\\n- **Backed by decades of research** into bioelectrical medicine",
  "seoKeywords": ["microcurrent therapy", "frequency wellness", "bioelectrical medicine", "natural health support", "wearable wellness"],
  "estimatedReadTime": 6,
  "generatedAt": "2026-05-30T12:00:00.000Z"
}`,
  sales: `{
  "overallScore": 87,
  "category": "gold",
  "bantScore": { "budget": 8, "authority": 9, "need": 7, "timeline": 8 },
  "criteria": [
    { "criterion": "Decision-making authority", "score": 9, "weight": 2, "notes": "Clinic director with full purchasing authority" },
    { "criterion": "Existing wellness offerings", "score": 8, "weight": 2, "notes": "Already recommends holistic products to patients" },
    { "criterion": "Patient base", "score": 7, "weight": 1.5, "notes": "500+ active patients - strong distribution potential" },
    { "criterion": "Technology openness", "score": 7, "weight": 1.5, "notes": "Uses practice management software, open to tech solutions" }
  ],
  "recommendedAction": "Schedule a 20-minute intro call to demonstrate Healy's clinical applications",
  "nextBestStep": "Send personalized email with case studies from similar practices"
}`,
  ceo: `{
  "executiveSummary": "Launch a strategic 3-month campaign targeting NYC wellness practitioners. Leverage content marketing, personalized outreach, and strategic partnerships to build market presence and generate 50 qualified leads.",
  "prioritizedTasks": [
    { "task": "Create educational content series on frequency wellness", "department": "Content", "priority": "high", "deadline": "Week 1-2" },
    { "task": "Source 200+ prospect leads from NYC practitioner directories", "department": "Research", "priority": "critical", "deadline": "Week 1" },
    { "task": "Design social media campaign assets", "department": "Design", "priority": "high", "deadline": "Week 2" },
    { "task": "Launch personalized email outreach to top 50 prospects", "department": "Sales", "priority": "critical", "deadline": "Week 2-3" }
  ],
  "resourceAllocation": [
    { "department": "Content", "budget": "$3,000", "hours": "80" },
    { "department": "Research", "budget": "$1,000", "hours": "60" },
    { "department": "Design", "budget": "$4,000", "hours": "100" },
    { "department": "Sales", "budget": "$5,000", "hours": "160" },
    { "department": "Finance", "budget": "$2,000", "hours": "40" }
  ],
  "kpis": [
    { "metric": "Qualified Leads", "target": "50", "measurement": "Pipeline value >$500" },
    { "metric": "Consultations Booked", "target": "15", "measurement": "Confirmed appointments" }
  ]
}`,
  cfo: `{
  "budgetAllocation": [
    { "category": "Content Creation", "amount": 3500, "percentage": 23 },
    { "category": "Email Outreach Tools", "amount": 1200, "percentage": 8 },
    { "category": "Design Assets", "amount": 2500, "percentage": 17 },
    { "category": "Lead Sourcing", "amount": 1800, "percentage": 12 },
    { "category": "Sales Tools", "amount": 2000, "percentage": 13 },
    { "category": "Contingency", "amount": 1500, "percentage": 10 },
    { "category": "Miscellaneous", "amount": 2500, "percentage": 17 }
  ],
  "costPerLead": [
    { "channel": "Email Outreach", "costPerLead": 8, "projectedLeads": 150 },
    { "channel": "Content Marketing", "costPerLead": 12, "projectedLeads": 80 },
    { "channel": "Social Media", "costPerLead": 15, "projectedLeads": 60 },
    { "channel": "Referral Program", "costPerLead": 5, "projectedLeads": 40 }
  ],
  "roiProjection": [
    { "metric": "30-Day ROI", "value": "185%", "confidence": "Medium" },
    { "metric": "60-Day ROI", "value": "340%", "confidence": "High" },
    { "metric": "90-Day ROI", "value": "520%", "confidence": "High" }
  ],
  "breakevenAnalysis": {
    "breakevenPoint": "12 qualified appointments",
    "timelineDays": 45,
    "notes": "Conservative estimate based on $1,250 average deal size"
  },
  "recommendations": [
    "Prioritize email outreach for lowest CPL ($8)",
    "Allocate 60% of content budget to blog + SEO for long-term ROI",
    "Set up referral program to drive CPL below $5"
  ]
}`,
  research: `{
  "targetName": "Integrative Health Partners",
  "summary": "A leading integrative medicine practice in San Francisco with 5 practitioners serving 2,000+ patients. They specialize in functional medicine, acupuncture, and nutritional therapy with a strong emphasis on non-invasive treatments.",
  "painPoints": [
    "Limited non-pharmaceutical options for chronic pain patients",
    "High patient churn due to slow treatment progress",
    "Need for differentiation in competitive SF wellness market",
    "Patients asking about frequency technology but no solution to offer"
  ],
  "opportunities": [
    "Healy fills a gap in their technology offerings",
    "Could become a distribution partner for other practices",
    "Strong alignment with their 'whole person' treatment philosophy",
    "Potential for co-branded educational workshops"
  ],
  "keyInsights": [
    "Medical Director is actively researching frequency devices",
    "Practice has budget for new equipment this quarter",
    "Previous experience with biofeedback suggests openness to Healy",
    "Published articles on integrative approaches - credibility builder"
  ]
}`,
  design: `{
  "concepts": [
    {
      "title": "Stress Relief, Reimagined",
      "headline": "Find Your Frequency",
      "subheadline": "15 minutes to calm. Science meets wellness.",
      "visualDescription": "Split composition: left side shows a stressed silhouette in grayscale with chaotic lines, right side transitions to the same person in warm colors surrounded by soft light waves. The Healy device is shown naturally worn on the arm in the center transition point.",
      "colorPalette": { "primary": "#6366f1", "secondary": "#a78bfa", "accent": "#f59e0b", "background": "#f8fafc" },
      "vibe": "educational",
      "cta": "Start Your Free Trial"
    },
    {
      "title": "Your Body Knows",
      "headline": "Listen to Your Cells",
      "subheadline": "Personalized microcurrent frequencies for your unique wellness journey",
      "visualDescription": "Abstract representation of cells with responsive light patterns, suggesting communication and harmony. Soft gradients with holographic elements.",
      "colorPalette": { "primary": "#06b6d4", "secondary": "#3b82f6", "accent": "#8b5cf6", "background": "#0f172a" },
      "vibe": "emotional",
      "cta": "Explore the Science"
    }
  ]
}`,
  developer: `{
  "issueSummary": "TypeScript compilation error E-4221: Property 'user' does not exist on type 'Session' from next-auth",
  "rootCause": "The Session type from next-auth v5 does not include a 'user' property at the top level. In v5, the session object is structured as { user: { ... } } but the type definition needs to be extended via module augmentation.",
  "severity": "high",
  "fixSteps": [
    {
      "file": "src/types/next-auth.d.ts",
      "change": "Add module augmentation for next-auth Session type",
      "reasoning": "NextAuth v5 requires explicit type extension through module augmentation rather than relying on default types"
    }
  ],
  "estimatedTimeMinutes": 15,
  "preventiveMeasures": [
    "Always extend NextAuth types when adding custom session fields",
    "Run 'npx tsc --noEmit' after any auth-related changes"
  ],
  "affectedFiles": ["src/types/next-auth.d.ts", "src/lib/auth.ts"]
}`,
  outreach: `{
  "subject": "Exploring frequency technology for your acupuncture practice",
  "body": "Hi Dr. Thompson,\\n\\nI came across Thompson Acupuncture & Wellness and was impressed by your holistic approach to patient care. Your expertise in energy meridians and natural healing aligns beautifully with what we do at Healy.\\n\\nWe specialize in personalized microcurrent frequency technology that many acupuncturists are finding to be a perfect complement to their existing treatments. It's non-invasive, drug-free, and backed by research.\\n\\nWould you be open to a 15-minute discovery call next week? I'd love to show you how Healy works and hear about your experience with energy-based therapies.\\n\\nWarmly,\\nSarah\\nHealy Wellness Team",
  "personalizedFields": { "name": "Dr. Thompson", "practice": "Thompson Acupuncture & Wellness" },
  "tone": "warm",
  "callToAction": "Would you be open to a 15-minute discovery call next week?"
}`,
  scraper: `{
  "leads": [
    { "name": "Dr. Elena Martinez", "company": "Serenity Wellness Center", "role": "Naturopathic Doctor", "email": "elena@serenitywellness.com", "score": 92, "personaType": "practitioner", "notes": "Established practice with 500+ patients. Currently recommends supplements. Open to frequency technology." },
    { "name": "James Mitchell", "company": "Biohack Labs", "role": "CEO", "email": "james@biohacklabs.io", "score": 88, "personaType": "biohacker", "notes": "Wellness tech entrepreneur. Always testing new biohacking devices. High influence potential." },
    { "name": "Dr. Sarah Chen", "company": "Holistic Health NYC", "role": "Clinic Director", "email": "sarah@holistic.health", "score": 85, "personaType": "practitioner", "notes": "Integrative medicine clinic. Decision-maker for equipment purchases. Interested in non-invasive technologies." },
    { "name": "Anaya Patel", "company": "Harmony Yoga Studio", "role": "Studio Owner", "email": "anaya@harmonyyoga.com", "score": 72, "personaType": "wellness-seeker", "notes": "Yoga studio with 200+ students. Looking for holistic products to recommend." },
    { "name": "Dr. Alex Kimura", "company": "Integrative Health Partners", "role": "Medical Director", "email": "akimura@ihp.com", "score": 90, "personaType": "practitioner", "notes": "Leading integrative medicine practice. Strong research background. Perfect clinical partner." }
  ],
  "count": 5,
  "source": "directory"
}`,
  analyst: `{
  "trends": [
    { "trend": "Rise of biohacking in mainstream wellness", "impact": "High", "actionItem": "Create content bridging biohacking and frequency technology" },
    { "trend": "Integrative medicine adoption by hospitals", "impact": "Medium", "actionItem": "Develop partnership pitch for hospital wellness programs" },
    { "trend": "Wearable health tech market growing 18% YoY", "impact": "High", "actionItem": "Position Healy as the smart wearable for frequency wellness" }
  ],
  "competitorAnalysis": [
    { "competitor": "SOMRA", "strengths": "Clinical validation, hospital partnerships", "weaknesses": "High cost, not portable", "gap": "Home-use frequency device with clinical credibility" },
    { "competitor": "Auri", "strengths": "Design, app experience", "weaknesses": "Limited clinical backing, narrow use case", "gap": "Comprehensive wellness platform with research support" }
  ],
  "audienceInsights": [
    { "segment": "Holistic Practitioners", "painPoints": "Need non-pharma options for patients", "channelPreference": "Email + LinkedIn", "messageAngle": "Clinical evidence + patient satisfaction" },
    { "segment": "Wellness Seekers", "painPoints": "Exhausted by supplement regimens", "channelPreference": "Instagram + Email", "messageAngle": "Simplicity + natural approach" },
    { "segment": "Biohackers", "painPoints": "Plateaued with current protocols", "channelPreference": "Social media + Podcasts", "messageAngle": "Data-driven results + optimization" }
  ]
}`,
};

// ============ INTERACTIVE AGENT DEMO COMPONENT ============

interface InteractiveAgentDemoProps {
  /** When true, shows a full-width layout with minimal padding (for the dedicated playground page) */
  fullWidth?: boolean;
  /** Callback when an agent completes execution */
  onRunComplete?: (agentId: string, durationMs: number, tokenCount: number) => void;
}

export default function InteractiveAgentDemo({ fullWidth, onRunComplete }: InteractiveAgentDemoProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string | number>>({});
  const [runState, setRunState] = useState<"idle" | "running" | "complete">("idle");
  const [resultText, setResultText] = useState("");
  const [visibleLines, setVisibleLines] = useState(0);
  const [cost, setCost] = useState({ model: "gpt-4o-mini", cost: 0.002, tokens: 0 });
  const [completedIn, setCompletedIn] = useState("0.0s");

  const config = AGENT_FORM_CONFIGS[selectedIndex];
  const Icon = config.icon;

  // Initialize form values when switching agents
  useEffect(() => {
    const defaults: Record<string, string | number> = {};
    config.fields.forEach((f) => {
      defaults[f.key] = f.default ?? "";
    });
    setFormValues(defaults);
    setRunState("idle");
    setResultText("");
    setVisibleLines(0);
  }, [selectedIndex]);

  const updateField = (key: string, value: string | number) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Typing animation
  useEffect(() => {
    if (runState !== "complete" || !resultText) return;
    const lines = resultText.split("\n");
    if (visibleLines >= lines.length) return;
    const timer = setTimeout(() => {
      setVisibleLines((v) => Math.min(v + 1, lines.length));
    }, 30 + Math.random() * 40);
    return () => clearTimeout(timer);
  }, [runState, resultText, visibleLines]);

  const runAgent = () => {
    setRunState("running");
    setResultText("");
    setVisibleLines(0);

    const duration = 800 + Math.random() * 1200;

    setTimeout(() => {
      const mockResult = MOCK_RESULTS[config.id] ?? '{\n  \"status\": \"completed\",\n  \"output\": \"Analysis complete.\"\n}';
      setResultText(mockResult);

      const tokens = Math.floor(200 + Math.random() * 600);
      setCost({
        model: "gpt-4o-mini",
        cost: parseFloat((tokens * 0.00015).toFixed(4)),
        tokens,
      });

      const time = ((800 + Math.random() * 1200) / 1000).toFixed(1);
      setCompletedIn(`${time}s`);
      setRunState("complete");
      setVisibleLines(0);

      onRunComplete?.(config.id, parseFloat(time) * 1000, tokens);
    }, duration);
  };

  const resultLines = resultText.split("\n");

  const containerClass = fullWidth
    ? "space-y-4"
    : "space-y-4";

  return (
    <div className={containerClass}>
      {/* Agent Selector Row */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {AGENT_FORM_CONFIGS.map((a, i) => {
          const AgentIcon = a.icon;
          const isSelected = selectedIndex === i;
          return (
            <button
              key={a.id}
              onClick={() => setSelectedIndex(i)}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 min-w-[80px] transition-all flex-shrink-0",
                isSelected
                  ? "border-primary-200 bg-white shadow-sm ring-2 ring-primary-100 dark:border-primary-700 dark:bg-surface-800 dark:ring-primary-900"
                  : "border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600"
              )}
            >
              <div className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", a.bg)}>
                <AgentIcon className={clsx("h-4 w-4", a.color)} />
              </div>
              <span className={clsx("text-[10px] font-medium whitespace-nowrap",
                isSelected ? "text-surface-900 dark:text-surface-100" : "text-surface-500"
              )}>
                {a.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Panel */}
      <div className={clsx("grid grid-cols-1 gap-4", fullWidth ? "lg:grid-cols-2" : "lg:grid-cols-5")}>
        {/* Form Panel */}
        <div className={fullWidth ? "lg:col-span-1" : "lg:col-span-2"}>
          <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-center gap-3 mb-4">
              <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", config.bg)}>
                <Icon className={clsx("h-5 w-5", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{config.name}</h4>
                <p className="text-xs text-surface-400 truncate">{config.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {config.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`agent-demo-${config.id}-${field.key}`} className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select
                      id={`agent-demo-${config.id}-${field.key}`}
                      value={String(formValues[field.key] ?? "")}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={`agent-demo-${config.id}-${field.key}`}
                      value={String(formValues[field.key] ?? "")}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all resize-none"
                    />
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      id={`agent-demo-${config.id}-${field.key}`}
                      value={formValues[field.key] ?? ""}
                      onChange={(e) => updateField(field.key, parseInt(e.target.value) || 0)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all"
                    />
                  ) : (
                    <input
                      type="text"
                      id={`agent-demo-${config.id}-${field.key}`}
                      value={String(formValues[field.key] ?? "")}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900 transition-all"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={runAgent}
              disabled={runState === "running"}
              className={clsx(
                "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-all active:scale-[0.98]",
                runState === "running"
                  ? "bg-surface-200 text-surface-400 dark:bg-surface-700 dark:text-surface-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-primary-500 to-primary-700 text-white hover:shadow-md"
              )}
            >
              {runState === "running" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running {config.name}...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Agent
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className={fullWidth ? "lg:col-span-1" : "lg:col-span-3"}>
          <div className="space-y-3">
            {/* Status bar */}
            <div className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {runState === "idle" && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-700">
                      <Play className="h-4 w-4 text-surface-400" />
                    </div>
                  )}
                  {runState === "running" && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                    </div>
                  )}
                  {runState === "complete" && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {runState === "idle" && "Configure & Run"}
                      {runState === "running" && "Processing..."}
                      {runState === "complete" && "Execution Complete"}
                    </p>
                    <p className="text-xs text-surface-400">
                      {runState === "idle" && "Fill out the form and click Run Agent"}
                      {runState === "running" && `Running ${config.name} with AI...`}
                      {runState === "complete" && `Completed in ${completedIn}`}
                    </p>
                  </div>
                </div>
                {runState === "complete" && (
                  <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1 text-[10px] font-medium text-primary-700 dark:text-primary-400">
                    <Zap className="h-3 w-3 mr-1" />
                    {cost.tokens} tokens · ${cost.cost}
                  </span>
                )}
              </div>

              {/* Progress bar during running */}
              {runState === "running" && (
                <div className="mt-3 h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 animate-progress-bar" />
                </div>
              )}
            </div>

            {/* JSON Output */}
            <div className="rounded-xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-surface-100 px-4 py-2.5 dark:border-surface-700">
                <Code className="h-3.5 w-3.5 text-surface-400" />
                <span className="text-xs font-medium text-surface-500">Output</span>
                {runState === "complete" && (
                  <span className="ml-auto text-[10px] text-surface-400">{resultLines.length} lines</span>
                )}
              </div>
              <div className="overflow-x-auto">
                <pre className="p-4 text-[11px] leading-5 font-mono">
                  {runState === "idle" && (
                    <span className="text-surface-300 dark:text-surface-600 italic">
                      {'{\n  "status": "awaiting_input",\n  "message": "Configure the agent and press Run Agent to see results"\n}'}
                    </span>
                  )}
                  {runState === "running" && (
                    <span className="text-surface-400">
                      <span className="animate-pulse">▊</span>
                    </span>
                  )}
                  {runState === "complete" && (
                    <span className="text-surface-700 dark:text-surface-300">
                      {resultLines.slice(0, visibleLines).map((line, i) => (
                        <span key={i}>
                          {line}
                          {"\n"}
                        </span>
                      ))}
                      {visibleLines < resultLines.length && (
                        <span className="animate-pulse text-primary-500">▊</span>
                      )}
                    </span>
                  )}
                </pre>
              </div>
            </div>

            {/* Key metrics when complete */}
            {runState === "complete" && (
              <div className="flex items-center gap-2 text-[10px] text-surface-400">
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-50 dark:bg-surface-700 px-2 py-1">
                  <Zap className="h-3 w-3" /> Model: {cost.model}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-50 dark:bg-surface-700 px-2 py-1">
                  <Activity className="h-3 w-3" /> {cost.tokens} tokens
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-50 dark:bg-surface-700 px-2 py-1">
                  <DollarIcon className="h-3 w-3" /> ${cost.cost.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
