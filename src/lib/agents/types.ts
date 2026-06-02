// AI Agent Types - Full Corporate Hierarchy

// =============== BUSINESS PROFILE ===============
// Configured by the user in Settings — all agents dynamically adapt to this

export interface BusinessProfile {
  businessName: string;
  industry: string;
  targetAudience: string;
  productDescription: string;
  keySellingPoints: string;
  brandVoice: string;
}

export function getDefaultBusinessProfile(): BusinessProfile {
  return {
    businessName: "Healy",
    industry: "frequency wellness technology",
    targetAudience: "Wellness seekers, holistic practitioners, biohackers, and business builders",
    productDescription: "Personalized microcurrent frequency wellness devices for natural health support",
    keySellingPoints: "Non-invasive, drug-free, wearable, personalized through AI, backed by research",
    brandVoice: "Warm, educational, holistic, science-meets-wellness, premium yet accessible",
  };
}

export function getBusinessProfileFromContext(context?: Record<string, unknown>): BusinessProfile {
  if (context?.businessProfile && typeof context.businessProfile === "object") {
    return context.businessProfile as BusinessProfile;
  }
  return getDefaultBusinessProfile();
}

export type AgentType = "sales" | "content" | "research" | "outreach" | "scraper";

export type AgentStatus = "idle" | "running" | "completed" | "error";

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  model: string;
  temperature: number;
  maxTokens: number;
  provider?: string;
}

export interface AgentResult {
  id: string;
  agentType: AgentType;
  status: AgentStatus;
  output: string;
  error?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// =============== SALES TEAM ===============
export type SalesSubAgent = "lead-qualifier" | "message-personalizer" | "appointment-scheduler" | "followup-manager";

export interface SalesBrief {
  leadName: string;
  leadCompany: string;
  leadRole: string;
  personaType: "wellness-seeker" | "practitioner" | "biohacker" | "business-builder";
  researchSummary?: string;
  previousInteractions?: string;
  channel: "whatsapp" | "email" | "linkedin" | "phone";
  urgency: "hot" | "warm" | "cold";
}

export interface LeadScoring {
  overallScore: number;
  category: "platinum" | "gold" | "silver" | "bronze";
  criteria: { criterion: string; score: number; weight: number; notes: string }[];
  bantScore: { budget: number; authority: number; need: number; timeline: number };
  recommendedAction: string;
  nextBestStep: string;
}

export interface SalesCadence {
  steps: { day: number; action: string; channel: string; template: string; goal: string }[];
  totalDays: number;
  touchpoints: number;
  escalationTrigger: string;
}

// =============== COMMON TYPES ===============

export interface ContentBrief {
  topic: string;
  contentType: "blog" | "social" | "email" | "landing" | "ad";
  targetAudience: string;
  keyPoints: string[];
  tone?: string;
  length?: "short" | "medium" | "long";
  callToAction?: string;
  keywords?: string[];
}

export interface ContentResult {
  title: string;
  body: string;
  excerpt: string;
  seoKeywords: string[];
  contentType: "blog" | "social" | "email" | "landing" | "ad";
  estimatedReadTime?: number;
  generatedAt: Date;
}

export interface ResearchTarget {
  companyName?: string;
  industry?: string;
  role?: string;
  location?: string;
  website?: string;
}

export interface ResearchResult {
  targetName: string;
  summary: string;
  painPoints: string[];
  opportunities: string[];
  keyInsights: string[];
  sourceUrls?: string[];
}

export interface OutreachMessage {
  subject: string;
  body: string;
  personalizedFields: Record<string, string>;
  tone: "professional" | "friendly" | "casual";
  callToAction: string;
}

export type LeadSource = "manual" | "directory" | "apollo" | "linkedin" | "csv_import" | "referral" | "website" | "google-maps";

export type Region = "apac" | "americas" | "europe" | "middle-east";

export type LeadTemperature = "cold" | "warm" | "hot";

/**
 * Determine lead temperature automatically from score, engagement status, and appointment state.
 */
export function computeLeadTemperature(lead: { score: number; status: string; hasAppointment?: boolean; replied?: boolean }): LeadTemperature {
  // Hot: scored high, replied, qualified, or already has appointment
  if (lead.status === "appointment_scheduled" || lead.status === "closed" || lead.hasAppointment) return "hot";
  if (lead.replied || lead.status === "qualified") return "hot";
  if (lead.score >= 70) return "hot";

  // Warm: contacted or moderately scored
  if (lead.status === "contacted" || lead.score >= 40) return "warm";

  // Cold: everything else
  return "cold";
}

export type LeadSourceStatus = "sourced" | "contacted" | "nurturing" | "warm" | "hot" | "consultation_booked" | "closed_won" | "closed_lost";

export type NurtureStepType = "chat" | "email" | "whatsapp" | "phone_call" | "sms" | "linkedin_message" | "social_engagement";

export interface NurtureStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  type: NurtureStepType;
  subject?: string;
  template: string;
  delayDays: number;
  status: "pending" | "sent" | "opened" | "replied" | "converted" | "skipped";
  sentAt?: Date;
  responseAt?: Date;
  notes?: string;
}

export interface NurtureSequence {
  id: string;
  leadId: string;
  name: string;
  steps: NurtureStep[];
  currentStep: number;
  status: "active" | "paused" | "completed" | "converted";
  startedAt: Date;
  lastActionAt?: Date;
  convertedAt?: Date;
}

export interface ScraperSource {
  type: "directory" | "apollo" | "linkedin" | "google-maps";
  query: string;
  industry?: string;
  location?: string;
  role?: string;
  maxResults: number;
}

export interface ScrapedLead {
  name: string;
  company: string;
  role: string;
  email: string;
  phone?: string;
  source: LeadSource;
  sourceUrl?: string;
  score: number;
  notes: string;
  personaType: string;
  // ==== Business details from Google Maps ====
  rating?: string;        // e.g. "4.5"
  reviews?: string;       // e.g. "123"
  address?: string;       // Full street address
  businessDetails?: string; // Rich description / summary of the business
  category?: string;      // Business type (e.g. "Holistic health", "Chiropractor")
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  email: string;
  company: string;
  logoUrl?: string;
  primaryColor: string;
  isActive: boolean;
  settings?: Record<string, unknown>;
  createdAt: Date;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone?: string;
  source: LeadSource;
  sourceUrl?: string;
  status: "new" | "contacted" | "qualified" | "appointment_scheduled" | "closed" | "lost";
  pipelineStage: LeadSourceStatus;
  temperature?: LeadTemperature; // auto-computed: cold / warm / hot
  score: number;
  personaType: string;
  notes: string;
  createdAt: Date;
  lastContactedAt?: Date;
  nextFollowUp?: Date;
  // ==== Country/Region (for international lead targeting) ====
  country?: string;       // ISO 3166-1 alpha-2 code: "IN", "US", "DE", etc.
  region?: Region;        // "apac" | "americas" | "europe" | "middle-east"
  language?: string;      // Primary language code: "en", "hi", "es", etc.
}

export interface PipelineMetrics {
  stage: LeadSourceStatus;
  label: string;
  count: number;
  leads: Lead[];
  color: string;
}

export interface Appointment {
  id: string;
  leadId: string;
  leadName: string;
  leadCompany: string;
  dateTime: Date;
  duration: number;
  type: "discovery" | "demo" | "proposal" | "follow_up";
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string;
  createdBy: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  contentGenerated: number;
  outreachSent: number;
  leadsSourcedThisWeek: number;
  activeNurtureSequences: number;
  conversionRate: number;
  recentActivity: ActivityItem[];
  coldLeads: number;
  warmLeads: number;
  hotLeads: number;
}

export interface ActivityItem {
  id: string;
  type: "content" | "research" | "outreach" | "appointment" | "lead" | "scraper" | "nurture" | "ceo" | "cfo" | "analyst" | "design" | "sales";
  description: string;
  timestamp: Date;
  status?: string;
}
