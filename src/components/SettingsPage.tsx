"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Bell,
  Shield,
  Palette,
  Save,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Bot,
  Globe,
  Zap,
  Cpu,
  ChevronDown,
  Mail,
  MessageCircle,
  Smartphone,
  Send,
  Unlink,
  Loader2,
  Atom,
  Brain,
  Wind,
  Network,
  Earth,
  MapPin,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";
import clsx from "clsx";

// ============ PROVIDER CONFIG ============

interface ModelOption {
  id: string;
  label: string;
  cost: string;
}

interface ProviderDef {
  id: string;
  label: string;
  icon: typeof Bot;
  color: string;
  bgColor: string;
  envKey: string;
  storageKey: string;
  defaultModel: string;
  models: ModelOption[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "openai",
    label: "OpenAI",
    icon: Bot,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
    envKey: "OPENAI_API_KEY",
    storageKey: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini", cost: "Cheapest — $0.15/$0.60 per 1M tokens" },
      { id: "gpt-4o", label: "GPT-4o", cost: "Standard — $2.50/$10 per 1M tokens" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", cost: "New gen — $0.40/$1.60 per 1M" },
      { id: "gpt-4.1", label: "GPT-4.1", cost: "Best quality — $2.00/$8.00 per 1M" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: Sparkles,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    envKey: "GEMINI_API_KEY",
    storageKey: "GEMINI_API_KEY",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", cost: "Fast & cheap — free tier available" },
      { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite", cost: "Cheapest Gemini option" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", cost: "Latest, balanced performance" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", cost: "Best quality Gemini" },
    ],
  },
  {
    id: "claude",
    label: "Claude",
    icon: Cpu,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    envKey: "ANTHROPIC_API_KEY",
    storageKey: "ANTHROPIC_API_KEY",
    defaultModel: "claude-3-5-haiku-20241022",
    models: [
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", cost: "Fast & cheap — $0.80/$4.00 per 1M" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", cost: "Best balance — $3.00/$15 per 1M" },
      { id: "claude-opus-4-20250514", label: "Claude Opus 4", cost: "Best quality — $15/$75 per 1M" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    icon: Globe,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    envKey: "OPENROUTER_API_KEY",
    storageKey: "OPENROUTER_API_KEY",
    defaultModel: "openai/gpt-4o-mini",
    models: [
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (via OpenRouter)", cost: "Aggregated pricing" },
      { id: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)", cost: "Aggregated pricing" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (via OR)", cost: "Aggregated pricing" },
      { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash (via OR)", cost: "Aggregated pricing" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    icon: Zap,
    color: "text-rose-600",
    bgColor: "bg-rose-50 border-rose-200",
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
  {
    id: "deepseek",
    label: "DeepSeek",
    icon: Brain,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 border-cyan-200",
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
  {
    id: "xai",
    label: "xAI (Grok)",
    icon: Atom,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
    envKey: "XAI_API_KEY",
    storageKey: "XAI_API_KEY",
    defaultModel: "grok-4.3",
    models: [
      { id: "grok-4.3", label: "Grok 4.3", cost: "Flagship — $1.25/$2.50 per 1M" },
      { id: "grok-build-0.1", label: "Grok Build 0.1", cost: "Coding — $1.00/$2.00 per 1M" },
      { id: "grok-4.20-0309-reasoning", label: "Grok 4.20 Reasoning", cost: "Reasoning — $1.25/$2.50 per 1M" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral AI",
    icon: Wind,
    color: "text-sky-600",
    bgColor: "bg-sky-50 border-sky-200",
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
  {
    id: "together",
    label: "Together AI",
    icon: Network,
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-violet-200",
    envKey: "TOGETHER_API_KEY",
    storageKey: "TOGETHER_API_KEY",
    defaultModel: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    models: [
      { id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", label: "Llama 4 Scout", cost: "~$0.11/$0.34 per 1M" },
      { id: "deepseek-ai/DeepSeek-V4-Pro", label: "DeepSeek V4 Pro", cost: "~$1.74/$3.48 per 1M" },
      { id: "Qwen/Qwen3-70B-Instruct", label: "Qwen 3 70B", cost: "~$0.89/$0.89 per 1M" },
      { id: "google/gemma-4-9b-it", label: "Gemma 4 9B", cost: "~$0.10/$0.10 per 1M" },
    ],
  },
];

// ============ COUNTRY DATA FOR UI ============

interface CountryUI {
  code: string;
  name: string;
  region: string;
  channelPreference: "whatsapp" | "email" | "hybrid";
  whatsappPenetration: "high" | "medium" | "low";
  phoneCountryCode: string;
  language: string;
  flag: string;
}

const ALL_COUNTRIES_UI: CountryUI[] = [
  // APAC
  { code: "IN", name: "India", region: "apac", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+91", language: "hi", flag: "🇮🇳" },
  { code: "PH", name: "Philippines", region: "apac", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+63", language: "tl", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", region: "apac", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+62", language: "id", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", region: "apac", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+60", language: "ms", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", region: "apac", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+66", language: "th", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", region: "apac", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+84", language: "vi", flag: "🇻🇳" },
  { code: "KH", name: "Cambodia", region: "apac", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+855", language: "km", flag: "🇰🇭" },
  { code: "HK", name: "Hong Kong", region: "apac", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+852", language: "zh", flag: "🇭🇰" },
  { code: "SG", name: "Singapore", region: "apac", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+65", language: "en", flag: "🇸🇬" },
  { code: "TW", name: "Taiwan", region: "apac", channelPreference: "hybrid", whatsappPenetration: "medium", phoneCountryCode: "+886", language: "zh", flag: "🇹🇼" },
  { code: "AU", name: "Australia", region: "apac", channelPreference: "hybrid", whatsappPenetration: "medium", phoneCountryCode: "+61", language: "en", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", region: "apac", channelPreference: "hybrid", whatsappPenetration: "medium", phoneCountryCode: "+64", language: "en", flag: "🇳🇿" },
  { code: "JP", name: "Japan", region: "apac", channelPreference: "email", whatsappPenetration: "low", phoneCountryCode: "+81", language: "ja", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", region: "apac", channelPreference: "email", whatsappPenetration: "low", phoneCountryCode: "+82", language: "ko", flag: "🇰🇷" },
  // Americas
  { code: "US", name: "United States", region: "americas", channelPreference: "email", whatsappPenetration: "medium", phoneCountryCode: "+1", language: "en", flag: "🇺🇸" },
  { code: "CA", name: "Canada", region: "americas", channelPreference: "email", whatsappPenetration: "medium", phoneCountryCode: "+1", language: "en", flag: "🇨🇦" },
  { code: "MX", name: "Mexico", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+52", language: "es", flag: "🇲🇽" },
  { code: "CO", name: "Colombia", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+57", language: "es", flag: "🇨🇴" },
  { code: "CL", name: "Chile", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+56", language: "es", flag: "🇨🇱" },
  { code: "PE", name: "Peru", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+51", language: "es", flag: "🇵🇪" },
  { code: "EC", name: "Ecuador", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+593", language: "es", flag: "🇪🇨" },
  { code: "CR", name: "Costa Rica", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+506", language: "es", flag: "🇨🇷" },
  { code: "PA", name: "Panama", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+507", language: "es", flag: "🇵🇦" },
  { code: "GT", name: "Guatemala", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+502", language: "es", flag: "🇬🇹" },
  { code: "DO", name: "Dominican Republic", region: "americas", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+1", language: "es", flag: "🇩🇴" },
  // Europe
  { code: "GB", name: "United Kingdom", region: "europe", channelPreference: "email", whatsappPenetration: "medium", phoneCountryCode: "+44", language: "en", flag: "🇬🇧" },
  { code: "DE", name: "Germany", region: "europe", channelPreference: "email", whatsappPenetration: "medium", phoneCountryCode: "+49", language: "de", flag: "🇩🇪" },
  { code: "FR", name: "France", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+33", language: "fr", flag: "🇫🇷" },
  { code: "IT", name: "Italy", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+39", language: "it", flag: "🇮🇹" },
  { code: "ES", name: "Spain", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+34", language: "es", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", region: "europe", channelPreference: "email", whatsappPenetration: "medium", phoneCountryCode: "+31", language: "nl", flag: "🇳🇱" },
  { code: "CH", name: "Switzerland", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+41", language: "de", flag: "🇨🇭" },
  { code: "SE", name: "Sweden", region: "europe", channelPreference: "email", whatsappPenetration: "low", phoneCountryCode: "+46", language: "sv", flag: "🇸🇪" },
  { code: "NO", name: "Norway", region: "europe", channelPreference: "email", whatsappPenetration: "low", phoneCountryCode: "+47", language: "no", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", region: "europe", channelPreference: "email", whatsappPenetration: "low", phoneCountryCode: "+45", language: "da", flag: "🇩🇰" },
  { code: "FI", name: "Finland", region: "europe", channelPreference: "email", whatsappPenetration: "low", phoneCountryCode: "+358", language: "fi", flag: "🇫🇮" },
  { code: "PL", name: "Poland", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+48", language: "pl", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+351", language: "pt", flag: "🇵🇹" },
  { code: "BE", name: "Belgium", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+32", language: "nl", flag: "🇧🇪" },
  { code: "AT", name: "Austria", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+43", language: "de", flag: "🇦🇹" },
  { code: "IE", name: "Ireland", region: "europe", channelPreference: "email", whatsappPenetration: "medium", phoneCountryCode: "+353", language: "en", flag: "🇮🇪" },
  { code: "GR", name: "Greece", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+30", language: "el", flag: "🇬🇷" },
  { code: "HU", name: "Hungary", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+36", language: "hu", flag: "🇭🇺" },
  { code: "RO", name: "Romania", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+40", language: "ro", flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+359", language: "bg", flag: "🇧🇬" },
  { code: "HR", name: "Croatia", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+385", language: "hr", flag: "🇭🇷" },
  { code: "CZ", name: "Czech Republic", region: "europe", channelPreference: "hybrid", whatsappPenetration: "medium", phoneCountryCode: "+420", language: "cs", flag: "🇨🇿" },
  { code: "SK", name: "Slovakia", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+421", language: "sk", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+386", language: "sl", flag: "🇸🇮" },
  { code: "LT", name: "Lithuania", region: "europe", channelPreference: "hybrid", whatsappPenetration: "medium", phoneCountryCode: "+370", language: "lt", flag: "🇱🇹" },
  { code: "LV", name: "Latvia", region: "europe", channelPreference: "hybrid", whatsappPenetration: "medium", phoneCountryCode: "+371", language: "lv", flag: "🇱🇻" },
  { code: "EE", name: "Estonia", region: "europe", channelPreference: "email", whatsappPenetration: "medium", phoneCountryCode: "+372", language: "et", flag: "🇪🇪" },
  { code: "LU", name: "Luxembourg", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+352", language: "lb", flag: "🇱🇺" },
  { code: "MT", name: "Malta", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+356", language: "mt", flag: "🇲🇹" },
  { code: "CY", name: "Cyprus", region: "europe", channelPreference: "hybrid", whatsappPenetration: "high", phoneCountryCode: "+357", language: "el", flag: "🇨🇾" },
  { code: "UA", name: "Ukraine", region: "europe", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+380", language: "uk", flag: "🇺🇦" },
  // Middle East
  { code: "AE", name: "UAE", region: "middle-east", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+971", language: "ar", flag: "🇦🇪" },
  { code: "TR", name: "Turkey", region: "middle-east", channelPreference: "whatsapp", whatsappPenetration: "high", phoneCountryCode: "+90", language: "tr", flag: "🇹🇷" },
];

const SETTINGS_SECTIONS = [
  {
    id: "api",
    label: "API Keys",
    icon: Key,
    description: "Manage your AI provider API keys & model preferences",
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: Palette,
    description: "Customize your experience and default agent settings",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    description: "Configure email sending for AI follow-ups",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    description: "Connect business WhatsApp for automated outreach",
  },
  {
    id: "countries",
    label: "Countries",
    icon: Earth,
    description: "Configure global lead targeting across 60+ Healy markets",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Configure alerts for appointments and lead updates",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Manage your account security settings",
  },
];

// ============ BADGE COMPONENTS ============

function ChannelBadge({ preference }: { preference: string }) {
  const colors: Record<string, string> = {
    whatsapp: "bg-emerald-100 text-emerald-700",
    email: "bg-blue-100 text-blue-700",
    hybrid: "bg-amber-100 text-amber-700",
  };
  const labels: Record<string, string> = {
    whatsapp: "WA",
    email: "📧",
    hybrid: "📧💬",
  };
  return (
    <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded", colors[preference] || "bg-surface-100 text-surface-500")}>
      {labels[preference] || preference}
    </span>
  );
}

function WAPenetrationBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "text-emerald-600",
    medium: "text-amber-600",
    low: "text-surface-400",
  };
  const dots: Record<string, string> = {
    high: "●●●",
    medium: "●●○",
    low: "●○○",
  };
  return (
    <span className={clsx("text-[10px]", colors[level] || "text-surface-400")}>
      {dots[level] || "○○○"}
    </span>
  );
}

export function BusinessProfileForm({ profile, onChange, onSave, saved }: {
  profile: Record<string, string>;
  onChange: (p: Record<string, string>) => void;
  onSave: () => void;
  saved: boolean;
}) {
  const fields = [
    { key: "businessName", label: "Business Name", placeholder: "e.g. Healy, Acme Wellness", hint: "Your company or brand name" },
    { key: "industry", label: "Industry", placeholder: "e.g. frequency wellness technology, fitness, real estate", hint: "What industry does your business operate in?" },
    { key: "productDescription", label: "Product / Service Description", placeholder: "e.g. Personalized microcurrent frequency wellness devices", hint: "Briefly describe what you sell or offer" },
    { key: "targetAudience", label: "Target Audience", placeholder: "e.g. Wellness seekers, holistic practitioners, athletes", hint: "Who are your ideal customers?" },
    { key: "keySellingPoints", label: "Key Selling Points", placeholder: "e.g. Non-invasive, drug-free, wearable, AI-personalized", hint: "What makes your product unique?" },
    { key: "brandVoice", label: "Brand Voice / Tone", placeholder: "e.g. Warm, educational, holistic, premium yet accessible", hint: "How should your brand sound?" },
  ];

  const updateField = (key: string, value: string) => {
    onChange({ ...profile, [key]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary-600" />
          Business Profile
        </h3>
        <p className="text-sm text-surface-500 mt-1">
          Configure your business details. All AI agents will dynamically adapt their prompts to your business.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.key === "productDescription" || f.key === "keySellingPoints" || f.key === "brandVoice" ? "sm:col-span-2" : ""}>
            <label htmlFor={`bp-${f.key}`} className="block text-sm font-medium text-surface-700 mb-1">
              {f.label}
            </label>
            <input
              id={`bp-${f.key}`}
              type="text"
              value={profile[f.key] || ""}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
            />
            <p className="text-xs text-surface-400 mt-1">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
        >
          {saved ? (
            <><CheckCircle2 className="h-4 w-4" /> Saved!</>
          ) : (
            <><Save className="h-4 w-4" /> Save Business Profile</>
          )}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 animate-fade-in">
            <CheckCircle2 className="h-3 w-3" /> Business profile saved — agents will now use your settings
          </span>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs font-medium text-blue-800">
          💡 <strong>Tip:</strong> All agents will use this information automatically. 
          For example, the Content Agent will write about "{profile.businessName || "your business"}" instead of a hardcoded brand. 
          The Sales Agent will reference your product description in outreach. Change these and the entire system adapts instantly.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("api");
  const [activeProvider, setActiveProvider] = useState("openai");
  const [saved, setSaved] = useState(false);
  const [savedProvider, setSavedProvider] = useState("");

  // Availability settings (for future use)
  const [availabilityStart, setAvailabilityStart] = useState("09:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("17:00");
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [availSaved, setAvailSaved] = useState(false);

  // Email configuration
  const [emailProvider, setEmailProvider] = useState<string>("none");
  const [emailGmailUser, setEmailGmailUser] = useState("");
  const [emailGmailPass, setEmailGmailPass] = useState("");
  const [emailResendKey, setEmailResendKey] = useState("");
  const [emailSendgridKey, setEmailSendgridKey] = useState("");
  const [emailFromName, setEmailFromName] = useState("AI Sales Agent");
  const [emailFromEmail, setEmailFromEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);
  const [emailTesting, setEmailTesting] = useState(false);

  // ==================== COUNTRY CONFIGURATION ====================
  const [targetRegion, setTargetRegion] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryData, setCountryData] = useState<any[]>([]);
  const [enabledCountries, setEnabledCountries] = useState<Set<string>>(new Set());
  const [countriesSaved, setCountriesSaved] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(true);

  const COUNTRY_REGIONS = [
    { value: "", label: "🌍 All Countries", description: "Target all 60+ Healy markets worldwide" },
    { value: "apac", label: "🌏 Asia Pacific", description: "India, Philippines, Indonesia, Australia, Japan + more" },
    { value: "americas", label: "🌎 Americas", description: "US, Canada, Mexico, Colombia, Brazil + more" },
    { value: "europe", label: "🌍 Europe", description: "UK, Germany, France, Italy, Spain, Poland + more" },
    { value: "middle-east", label: "🕌 Middle East", description: "UAE, Turkey" },
  ];

  // Load country data and settings on mount
  useEffect(() => {
    async function loadCountries() {
      setCountriesLoading(true);
      try {
        const res = await fetch("/api/settings?key=pipeline_target_region");
        if (res.ok) {
          const data = await res.json();
          if (data.value) setTargetRegion(data.value);
        }
        const res2 = await fetch("/api/settings?key=pipeline_target_country");
        if (res2.ok) {
          const data = await res2.json();
          if (data.value) setTargetCountry(data.value);
        }
        const res3 = await fetch("/api/settings?key=pipeline_enabled_countries");
        if (res3.ok) {
          const data = await res3.json();
          if (data.value) {
            try {
              const parsed = JSON.parse(data.value);
              if (Array.isArray(parsed)) setEnabledCountries(new Set(parsed));
            } catch {}
          }
        }
        // Country data is defined statically in the UI — no API call needed
        setCountryData(ALL_COUNTRIES_UI);
      } catch {
        setCountryData(ALL_COUNTRIES_UI);
      } finally {
        setCountriesLoading(false);
      }
    }
    loadCountries();
  }, []);

  const handleSaveCountries = async () => {
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "pipeline_target_region", value: targetRegion }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "pipeline_target_country", value: targetCountry }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "pipeline_enabled_countries", value: JSON.stringify(Array.from(enabledCountries)) }),
        }),
      ]);
      setCountriesSaved(true);
      setTimeout(() => setCountriesSaved(false), 2500);
    } catch {
      console.error("Failed to save country settings");
    }
  };

  const toggleCountry = (code: string) => {
    setEnabledCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectAllCountries = () => {
    const filtered = getFilteredCountries();
    setEnabledCountries(new Set(filtered.map((c) => c.code)));
  };

  const clearAllCountries = () => {
    setEnabledCountries(new Set());
  };

  const getFilteredCountries = () => {
    let filtered = [...ALL_COUNTRIES_UI];
    if (targetRegion) {
      filtered = filtered.filter((c) => c.region === targetRegion);
    }
    if (countrySearch) {
      const q = countrySearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  // WhatsApp configuration
  const [whatsappStatus, setWhatsappStatus] = useState<string>("disconnected");
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);
  const [whatsappConnecting, setWhatsappConnecting] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // Business Profile
  const [businessProfile, setBusinessProfile] = useState<Record<string, string>>({
    businessName: "Healy",
    industry: "frequency wellness technology",
    targetAudience: "Wellness seekers, holistic practitioners, biohackers, and business builders",
    productDescription: "Personalized microcurrent frequency wellness devices for natural health support",
    keySellingPoints: "Non-invasive, drug-free, wearable, personalized through AI, backed by research",
    brandVoice: "Warm, educational, holistic, science-meets-wellness, premium yet accessible",
  });
  const [bpSaved, setBpSaved] = useState(false);

  // Per-provider API keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: "",
    gemini: "",
    claude: "",
    openrouter: "",
    groq: "",
    deepseek: "",
    xai: "",
    mistral: "",
    together: "",
  });
  // Per-provider selected model
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({
    openai: "gpt-4o-mini",
    gemini: "gemini-2.0-flash",
    claude: "claude-3-5-haiku-20241022",
    openrouter: "openai/gpt-4o-mini",
    groq: "llama-3.3-70b-versatile",
    deepseek: "deepseek-v4-flash",
    xai: "grok-4.3",
    mistral: "mistral-large-latest",
    together: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
  });
  // Default provider for agents
  const [defaultProvider, setDefaultProvider] = useState("openai");

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const keys: Record<string, string> = {};
    const models: Record<string, string> = {};
    for (const p of PROVIDERS) {
      keys[p.id] = localStorage.getItem(p.storageKey) || "";
      const savedModel = localStorage.getItem(`${p.storageKey}_MODEL`);
      models[p.id] = savedModel || p.defaultModel;
    }
    setApiKeys(keys);
    setSelectedModels(models);
    setDefaultProvider(localStorage.getItem("DEFAULT_PROVIDER") || "openai");
    // Load business profile
    const stored = localStorage.getItem("BUSINESS_PROFILE");
    if (stored) {
      try {
        setBusinessProfile(JSON.parse(stored));
      } catch {}
    }
    // Load availability settings
    // Load email config from DB
    loadEmailConfig();
    // Load WhatsApp status
    loadWhatsAppStatus();
  }, []);

  const handleSaveAvailability = async () => {
    setAvailSaved(true);
    setTimeout(() => setAvailSaved(false), 2500);
  };

  const handleSaveBusinessProfile = async () => {
    localStorage.setItem("BUSINESS_PROFILE", JSON.stringify(businessProfile));

    // Also save to server-side DB so the pipeline can read it (server-safe)
    try {
      const fields = [
        { key: "pipeline_business_name", value: businessProfile.businessName },
        { key: "pipeline_business_industry", value: businessProfile.industry },
        { key: "pipeline_business_product_desc", value: businessProfile.productDescription },
        { key: "pipeline_business_audience", value: businessProfile.targetAudience },
        { key: "pipeline_business_selling_points", value: businessProfile.keySellingPoints },
        { key: "pipeline_business_voice", value: businessProfile.brandVoice },
      ];
      await Promise.all(
        fields.map((f) =>
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
          })
        )
      );
    } catch {
      // Fallback: localStorage is sufficient for client-side use
    }

    setBpSaved(true);
    setTimeout(() => setBpSaved(false), 2500);
  };

  const handleSave = () => {
    // Save all API keys to localStorage (client-side agents)
    for (const p of PROVIDERS) {
      if (apiKeys[p.id]) {
        localStorage.setItem(p.storageKey, apiKeys[p.id]);
        localStorage.setItem(`${p.storageKey}_MODEL`, selectedModels[p.id]);
      }
    }
    localStorage.setItem("DEFAULT_PROVIDER", defaultProvider);

    // Also save default provider & model to DB so server-side modules (pipeline, followups, auto-booker) can read them
    try {
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "global_default_provider", value: defaultProvider }),
      });
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "global_default_model", value: selectedModels[defaultProvider] || "" }),
      });
    } catch {
      // DB write is best-effort — localStorage is sufficient for client-side agents
    }

    setSavedProvider(activeProvider);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ==================== EMAIL HANDLERS ====================

  const loadEmailConfig = async () => {
    try {
      const res = await fetch("/api/settings?key=email_provider");
      if (res.ok) {
        const data = await res.json();
        if (data.value) setEmailProvider(data.value);
      }
      const res2 = await fetch("/api/settings?key=email_gmail_user");
      if (res2.ok) {
        const data = await res2.json();
        if (data.value) setEmailGmailUser(data.value);
      }
      const res3 = await fetch("/api/settings?key=email_from_name");
      if (res3.ok) {
        const data = await res3.json();
        if (data.value) setEmailFromName(data.value);
      }
      const res4 = await fetch("/api/settings?key=email_from_email");
      if (res4.ok) {
        const data = await res4.json();
        if (data.value) setEmailFromEmail(data.value);
      }
    } catch {}
  };

  const handleSaveEmail = async () => {
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_provider", value: emailProvider }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_gmail_user", value: emailGmailUser }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_gmail_app_password", value: emailGmailPass }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_resend_api_key", value: emailResendKey }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_sendgrid_api_key", value: emailSendgridKey }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_from_name", value: emailFromName }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "email_from_email", value: emailFromEmail }),
        }),
      ]);
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
    } catch {
      setEmailTestResult("❌ Failed to save email config");
    }
  };

  const handleTestEmail = async () => {
    if (!emailFromEmail) {
      setEmailTestResult('❌ Please set a "From Email" address first');
      return;
    }
    setEmailTesting(true);
    setEmailTestResult(null);
    try {
      const res = await fetch(`/api/email/send?to=${encodeURIComponent(emailFromEmail)}`);
      const data = await res.json();
      if (data.success) {
        setEmailTestResult(`✅ Test email sent via ${data.provider}! Check your inbox.`);
      } else {
        setEmailTestResult(`❌ ${data.error || "Failed to send test"}`);
      }
    } catch (e) {
      setEmailTestResult(`❌ ${e instanceof Error ? e.message : "Network error"}`);
    } finally {
      setEmailTesting(false);
    }
  };

  // ==================== WHATSAPP HANDLERS ====================

  const loadWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp?action=status");
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data.status || "disconnected");
        setWhatsappPhone(data.phoneNumber || null);
        if (data.qrDataUrl) setWhatsappQr(data.qrDataUrl);
        if (data.error) setWhatsappError(data.error);
      }
    } catch {
      // API not available, likely no server running
    }
  };

  const handleWhatsAppConnect = async () => {
    setWhatsappConnecting(true);
    setWhatsappError(null);
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" }),
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappStatus("connecting");
        // Poll for QR code
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch("/api/whatsapp?action=status");
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setWhatsappStatus(statusData.status);
            if (statusData.qrDataUrl) setWhatsappQr(statusData.qrDataUrl);
            if (statusData.phoneNumber) setWhatsappPhone(statusData.phoneNumber);
            if (statusData.status === "connected" || statusData.status === "error") {
              clearInterval(pollInterval);
              setWhatsappConnecting(false);
              if (statusData.error) setWhatsappError(statusData.error);
            }
          }
        }, 3000);
      } else {
        setWhatsappError(data.error || "Failed to connect");
        setWhatsappConnecting(false);
      }
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : "Connection error");
      setWhatsappConnecting(false);
    }
  };

  const handleWhatsAppDisconnect = async () => {
    try {
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      setWhatsappStatus("disconnected");
      setWhatsappPhone(null);
      setWhatsappQr(null);
      setWhatsappError(null);
    } catch {
      setWhatsappError("Failed to disconnect");
    }
  };

  const activeProv = PROVIDERS.find((p) => p.id === activeProvider)!;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Settings</h2>
        <p className="text-sm text-surface-500 mt-1">
          Configure your AI provider keys, model preferences, and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="space-y-1">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={clsx(
                  "w-full rounded-lg px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-surface-600 hover:bg-surface-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={clsx("h-4 w-4", isActive ? "text-primary-600" : "text-surface-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-surface-400 truncate">{section.description}</p>
                  </div>
                  <ChevronRight className={clsx("h-3 w-3", isActive ? "text-primary-400" : "text-surface-300")} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-surface-200 bg-white p-6">
            {activeSection === "api" && (
              <div className="space-y-5">
                {/* Provider Tabs */}
                <div className="flex gap-2 flex-wrap">
                  {PROVIDERS.map((p) => {
                    const Icon = p.icon;
                    const isActive = activeProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setActiveProvider(p.id)}
                        className={clsx(
                          "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all border",
                          isActive
                            ? `${p.bgColor} ${p.color} shadow-sm`
                            : "border-surface-200 text-surface-500 hover:bg-surface-50 hover:text-surface-700"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Active Provider Panel */}
                <div className={clsx("rounded-lg border p-5 space-y-4", activeProv.bgColor)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
                        <activeProv.icon className={clsx("h-5 w-5", activeProv.color)} />
                        {activeProv.label} API Key
                      </h3>
                      <p className="text-sm text-surface-500 mt-0.5">
                        Keys are stored locally and never sent to our servers.
                      </p>
                    </div>
                  </div>

                  {/* API Key Input */}
                  <form onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label htmlFor={`api-key-${activeProvider}`} className="block text-sm font-medium text-surface-700 mb-1.5">
                      API Key
                    </label>
                    <input
                      id={`api-key-${activeProvider}`}
                      type="password"
                      value={apiKeys[activeProvider] || ""}
                      onChange={(e) =>
                        setApiKeys((prev) => ({ ...prev, [activeProvider]: e.target.value }))
                      }
                      placeholder={activeProvider === "openai" ? "sk-..." : "Enter your API key..."}
                      autoComplete="off"
                      className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                    />
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label htmlFor={`model-select-${activeProvider}`} className="block text-sm font-medium text-surface-700 mb-1.5">
                      Default Model
                    </label>
                    <select
                      id={`model-select-${activeProvider}`}
                      value={selectedModels[activeProvider] || activeProv.defaultModel}
                      onChange={(e) =>
                        setSelectedModels((prev) => ({ ...prev, [activeProvider]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                        paddingRight: "36px",
                      }}
                    >
                      {activeProv.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} — {m.cost}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-surface-400 mt-1.5">
                      Selected: <span className="font-medium text-surface-600">{selectedModels[activeProvider]}</span>
                    </p>
                  </div>
                </form>
                </div>

                {/* Default Provider Selector */}
                <form onSubmit={(e) => e.preventDefault()} className="rounded-lg border border-surface-200 bg-amber-50/40 p-4">
                  <p className="block text-sm font-medium text-surface-700 mb-2">
                    🎯 Default AI Provider for All Agents
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {PROVIDERS.map((p) => {
                      const isDefault = defaultProvider === p.id;
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setDefaultProvider(p.id)}
                          className={clsx(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all border",
                            isDefault
                              ? `${p.bgColor} ${p.color} shadow-sm ring-2 ring-offset-1 ${p.color.replace("text-", "ring-")}`
                              : "border-surface-200 text-surface-500 hover:bg-surface-50"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {p.label}
                          {isDefault && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-surface-400 mt-2">
                    Agents will use <strong className="text-surface-600">{defaultProvider.charAt(0).toUpperCase() + defaultProvider.slice(1)}</strong> by default. 
                    You can override per agent run from the provider selector.
                  </p>
                </form>

                {/* Save Button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
                  >
                    {saved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save All Keys
                      </>
                    )}
                  </button>
                  {saved && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 animate-fade-in">
                      <CheckCircle2 className="h-3 w-3" />
                      {savedProvider === "openai" ? "OpenAI" :
                       savedProvider === "gemini" ? "Gemini" :
                       savedProvider === "claude" ? "Claude" :
                       savedProvider === "openrouter" ? "OpenRouter" :
                       savedProvider === "groq" ? "Groq" :
                       savedProvider === "deepseek" ? "DeepSeek" :
                       savedProvider === "xai" ? "xAI (Grok)" :
                       savedProvider === "mistral" ? "Mistral AI" :
                       savedProvider === "together" ? "Together AI" :
                       "Provider"} key & model saved
                    </span>
                  )}
                </div>

                {/* Provider Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {PROVIDERS.map((p) => {
                    const Icon = p.icon;
                    const isConfigured = !!apiKeys[p.id];
                    return (
                      <div
                        key={p.id}
                        className={clsx(
                          "rounded-lg border p-3 transition-all",
                          isConfigured ? "border-emerald-200 bg-emerald-50/30" : "border-surface-200 bg-surface-50/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={clsx("h-4 w-4", p.color)} />
                          <span className="text-sm font-medium text-surface-700">{p.label}</span>
                          {isConfigured ? (
                            <span className="ml-auto text-xs font-medium text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Configured
                            </span>
                          ) : (
                            <span className="ml-auto text-xs text-surface-400">Not set</span>
                          )}
                        </div>
                        <p className="text-xs text-surface-400">
                          {p.models[0].cost}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-medium text-amber-800">
                    💡 <strong>Tip:</strong> You only need <strong>one</strong> provider key to run agents. 
                    OpenAI with gpt-4o-mini is the most cost-effective. Gemini offers a free tier. 
                    Claude gives the best quality for complex tasks.
                  </p>
                </div>
              </div>
            )}

            {activeSection === "preferences" && (
              <BusinessProfileForm
                profile={businessProfile}
                onChange={setBusinessProfile}
                onSave={handleSaveBusinessProfile}
                saved={bpSaved}
              />
            )}

            {activeSection === "email" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary-600" />
                    Email Configuration
                  </h3>
                  <p className="text-sm text-surface-500 mt-1">
                    Configure email sending for AI follow-ups and notifications.
                    All providers offer a <strong>free tier</strong>.
                  </p>
                </div>

                {/* Provider Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "none", label: "Disabled (Logs only)", cost: "$0" },
                    { id: "gmail_smtp", label: "Gmail SMTP", cost: "Free — 500/day" },
                    { id: "resend", label: "Resend", cost: "Free — 100/day" },
                    { id: "sendgrid", label: "SendGrid", cost: "Free — 100/day" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setEmailProvider(p.id)}
                      className={clsx(
                        "rounded-lg border px-3 py-2.5 text-xs font-medium transition-all text-left",
                        emailProvider === p.id
                          ? "border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                          : "border-surface-200 text-surface-500 hover:bg-surface-50"
                      )}
                    >
                      <div className="font-medium">{p.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{p.cost}</div>
                    </button>
                  ))}
                </div>

                {/* Gmail SMTP Fields */}
                {emailProvider === "gmail_smtp" && (
                  <form onSubmit={(e) => e.preventDefault()} className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-4">
                    <p className="text-xs font-medium text-blue-800">
                      📧 Use a <strong>Gmail App Password</strong> (not your regular password). 
                      Generate one at: 
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                        Google App Passwords
                      </a>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="email-gmail-user" className="block text-xs font-medium text-surface-700 mb-1">Gmail Address</label>
                        <input
                          id="email-gmail-user"
                          type="email"
                          value={emailGmailUser}
                          onChange={(e) => setEmailGmailUser(e.target.value)}
                          placeholder="you@gmail.com"
                          className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="email-gmail-pass" className="block text-xs font-medium text-surface-700 mb-1">App Password</label>
                        <input
                          id="email-gmail-pass"
                          type="password"
                          value={emailGmailPass}
                          onChange={(e) => setEmailGmailPass(e.target.value)}
                          autoComplete="off"
                          placeholder="16-char app password"
                        className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                      </div>
                    </div>
                  </form>
                )}

                {/* Resend Field */}
                {emailProvider === "resend" && (
                  <form onSubmit={(e) => e.preventDefault()} className="rounded-lg border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                    <p className="text-xs font-medium text-purple-800">
                      🔑 Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a> and get your API key.
                    </p>
                    <div>
                      <label htmlFor="email-resend-key" className="block text-xs font-medium text-surface-700 mb-1">Resend API Key</label>
                      <input
                        id="email-resend-key"
                        type="password"
                        value={emailResendKey}
                        onChange={(e) => setEmailResendKey(e.target.value)}
                        autoComplete="off"
                        placeholder="re_..."
                        className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    </form>
                )}

                {/* SendGrid Field */}
                {emailProvider === "sendgrid" && (
                  <form onSubmit={(e) => e.preventDefault()} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                    <p className="text-xs font-medium text-emerald-800">
                      🔑 Sign up at <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="underline">sendgrid.com</a> and create an API key.
                    </p>
                    <div>
                      <label htmlFor="email-sendgrid-key" className="block text-xs font-medium text-surface-700 mb-1">SendGrid API Key</label>
                      <input
                        id="email-sendgrid-key"
                        type="password"
                        value={emailSendgridKey}
                        onChange={(e) => setEmailSendgridKey(e.target.value)}
                        autoComplete="off"
                        placeholder="SG.xxxxx..."
                        className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    </form>
                )}

                {/* From fields */}
                {emailProvider !== "none" && (
                  <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="email-from-name" className="block text-xs font-medium text-surface-700 mb-1">From Name</label>
                      <input
                        id="email-from-name"
                        type="text"
                        value={emailFromName}
                        onChange={(e) => setEmailFromName(e.target.value)}
                        placeholder="AI Sales Agent"
                        className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="email-from-email" className="block text-xs font-medium text-surface-700 mb-1">From Email</label>
                      <input
                        id="email-from-email"
                        type="email"
                        value={emailFromEmail}
                        onChange={(e) => setEmailFromEmail(e.target.value)}
                        placeholder="noreply@yourbusiness.com"
                        className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </form>
                )}

                {/* Save & Test */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveEmail}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
                  >
                    {emailSaved ? (
                      <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save Email Config</>
                    )}
                  </button>
                  {emailProvider !== "none" && (
                    <button
                      onClick={handleTestEmail}
                      disabled={emailTesting}
                      className="inline-flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-all disabled:opacity-50"
                    >
                      {emailTesting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Testing...</>
                      ) : (
                        <><Send className="h-4 w-4" /> Send Test Email</>
                      )}
                    </button>
                  )}
                </div>

                {emailTestResult && (
                  <div className={clsx(
                    "rounded-lg p-3 text-xs",
                    emailTestResult.startsWith("✅") ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"
                  )}>
                    {emailTestResult}
                  </div>
                )}

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-medium text-amber-800">
                    💡 <strong>Cost:</strong> Gmail SMTP is <strong>completely free</strong> (500 emails/day). 
                    Resend and SendGrid offer free tiers (100 emails/day). All follow-up emails use these providers — no per-email cost.
                  </p>
                </div>
              </div>
            )}

            {activeSection === "whatsapp" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                    WhatsApp Web Connection
                  </h3>
                  <p className="text-sm text-surface-500 mt-1">
                    Connect your business WhatsApp to enable automated follow-up messages. 
                    Uses WhatsApp Web via browser automation — <strong>completely free</strong>.
                  </p>
                </div>

                {/* Connection Status */}
                <div className={clsx(
                  "rounded-lg border p-5 space-y-4",
                  whatsappStatus === "connected" ? "bg-emerald-50/50 border-emerald-200" :
                  whatsappStatus === "qr_ready" ? "bg-blue-50/50 border-blue-200" :
                  "bg-surface-50 border-surface-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        whatsappStatus === "connected" ? "bg-emerald-100 text-emerald-600" :
                        whatsappStatus === "qr_ready" ? "bg-blue-100 text-blue-600" :
                        "bg-surface-200 text-surface-400"
                      )}>
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-surface-900">
                          {whatsappStatus === "connected" ? "WhatsApp Connected" :
                           whatsappStatus === "qr_ready" ? "Scan QR Code" :
                           whatsappStatus === "connecting" ? "Connecting..." :
                           "Not Connected"}
                        </h4>
                        <p className="text-xs text-surface-500">
                          {whatsappStatus === "connected"
                            ? `Connected as: ${whatsappPhone || "WhatsApp"}`
                            : whatsappStatus === "qr_ready"
                            ? "Scan the QR code with your phone's WhatsApp"
                            : "Click Connect to start"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {whatsappStatus === "connected" ? (
                        <button
                          onClick={handleWhatsAppDisconnect}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Unlink className="h-3.5 w-3.5" />
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={handleWhatsAppConnect}
                          disabled={whatsappConnecting || whatsappStatus === "connecting"}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {whatsappConnecting || whatsappStatus === "connecting" ? "Connecting..." : "Connect WhatsApp"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QR Code Display */}
                  {whatsappStatus === "qr_ready" && whatsappQr && (
                    <div className="flex flex-col items-center py-4">
                      <img
                        src={whatsappQr}
                        alt="WhatsApp QR Code"
                        className="w-48 h-48 border-2 border-surface-200 rounded-lg"
                      />
                      <p className="text-xs text-surface-400 mt-3 text-center">
                        Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                      </p>
                    </div>
                  )}

                  {whatsappError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-xs font-medium text-red-700">{whatsappError}</p>
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>How it works:</strong> A browser window will open with WhatsApp Web. 
                    Scan the QR code with your phone. Once connected, the AI can automatically 
                    send follow-up messages to leads via WhatsApp — <strong>completely free</strong>, 
                    no per-message charges.
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-medium text-amber-800">
                    💡 <strong>Important:</strong> Keep the browser window open in the background. 
                    The session is saved and will auto-reconnect on restart. 
                    If the connection drops, simply click Connect again.
                  </p>
                </div>
              </div>
            )}

            {activeSection === "countries" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
                    <Earth className="h-5 w-5 text-primary-600" />
                    Global Country Targeting
                  </h3>
                  <p className="text-sm text-surface-500 mt-1">
                    Configure which countries to target for lead generation. 
                    The pipeline will scrape Google Maps for wellness businesses in selected markets.
                    <strong className="block mt-1 text-primary-600">60+ Healy markets across 4 regions</strong>
                  </p>
                </div>

                {/* Region Selector */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Target Region</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {COUNTRY_REGIONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setTargetRegion(r.value)}
                        className={clsx(
                          "rounded-lg border p-3 text-left transition-all",
                          targetRegion === r.value
                            ? "border-primary-300 bg-primary-50 ring-1 ring-primary-200"
                            : "border-surface-200 hover:bg-surface-50 hover:border-surface-300"
                        )}
                      >
                        <p className="text-sm font-medium text-surface-900">{r.label}</p>
                        <p className="text-xs text-surface-500 mt-0.5">{r.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search countries by name or code..."
                    aria-label="Search countries"
                    className="w-full rounded-lg border border-surface-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
                  />
                </div>

                {/* Select All / Clear */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-surface-500">
                    <span className="font-semibold text-surface-700">{getFilteredCountries().length}</span> countries shown
                    {targetRegion && ` in ${COUNTRY_REGIONS.find((r) => r.value === targetRegion)?.label || targetRegion}`}
                    {countrySearch && ` matching "${countrySearch}"`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllCountries}
                      className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-all"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllCountries}
                      className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-all"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Country Grid */}
                {countriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                    <span className="ml-2 text-sm text-surface-500">Loading countries...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {getFilteredCountries().map((c) => {
                      const isEnabled = enabledCountries.has(c.code);
                      return (
                        <button
                          key={c.code}
                          onClick={() => toggleCountry(c.code)}
                          className={clsx(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                            isEnabled
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-surface-200 hover:bg-surface-50 hover:border-surface-300"
                          )}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-900 truncate">{c.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-medium text-surface-400 uppercase">{c.code}</span>
                              <ChannelBadge preference={c.channelPreference} />
                              <WAPenetrationBadge level={c.whatsappPenetration} />
                            </div>
                          </div>
                          <div className={clsx(
                            "flex h-5 w-5 items-center justify-center rounded transition-all",
                            isEnabled ? "text-emerald-500" : "text-surface-300"
                          )}>
                            {isEnabled ? (
                              <ToggleRight className="h-5 w-5" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {getFilteredCountries().length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <MapPin className="h-8 w-8 text-surface-300 mb-2" />
                        <p className="text-sm text-surface-500">No countries match your search</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-center">
                    <p className="text-lg font-bold text-surface-900">{enabledCountries.size}</p>
                    <p className="text-[11px] text-surface-500">Enabled Countries</p>
                  </div>
                  <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">
                      {ALL_COUNTRIES_UI.filter((c) => enabledCountries.has(c.code) && c.whatsappPenetration === "high").length}
                    </p>
                    <p className="text-[11px] text-surface-500">High WhatsApp Reach</p>
                  </div>
                  <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {ALL_COUNTRIES_UI.filter((c) => enabledCountries.has(c.code) && c.channelPreference === "email").length}
                    </p>
                    <p className="text-[11px] text-surface-500">Email Preferred</p>
                  </div>
                  <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-center">
                    <p className="text-lg font-bold text-primary-600">
                      {Array.from(new Set(ALL_COUNTRIES_UI.filter((c) => enabledCountries.has(c.code)).map((c) => c.region))).length}
                    </p>
                    <p className="text-[11px] text-surface-500">Active Regions</p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveCountries}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
                  >
                    {countriesSaved ? (
                      <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save Country Settings</>
                    )}
                  </button>
                  {countriesSaved && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 animate-fade-in">
                      <CheckCircle2 className="h-3 w-3" /> Country targeting saved — pipeline will use these settings
                    </span>
                  )}
                </div>

                {/* Info Box */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>🌍 Global lead generation tips:</strong><br />
                    • <strong>WhatsApp-first countries</strong> (India, Philippines, Mexico, Colombia): WhatsApp is the primary business channel. Messages via WhatsApp get ~90%+ open rates.<br />
                    • <strong>Email-first countries</strong> (Germany, UK, US, Japan): Email is standard for business communication. WhatsApp follow-ups supplement.<br />
                    • <strong>Enable all countries</strong> for maximum reach. The AI enrichment automatically detects each lead's country and adjusts the outreach strategy.<br />
                    • <strong>Region focus</strong>: Start with APAC for highest WhatsApp penetration, then expand to Americas and Europe.
                  </p>
                </div>
              </div>
            )}

            {activeSection !== "api" && activeSection !== "preferences" && activeSection !== "email" && activeSection !== "whatsapp" && activeSection !== "countries" && activeSection !== "notifications" && activeSection !== "security" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="mb-3 h-10 w-10 text-surface-300" />
                <p className="text-sm font-medium text-surface-500">Coming Soon</p>
                <p className="text-xs text-surface-400 mt-1">
                  This section is under development
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
