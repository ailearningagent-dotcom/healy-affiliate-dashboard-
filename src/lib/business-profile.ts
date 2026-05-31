import { getDefaultBusinessProfile } from "@/lib/agents/types";
import type { BusinessProfile } from "@/lib/agents/types";

/** Load business profile from localStorage (client-side) */
export function loadBusinessProfile(): BusinessProfile {
  if (typeof window === "undefined") return getDefaultBusinessProfile();
  try {
    const stored = localStorage.getItem("BUSINESS_PROFILE");
    if (stored) return JSON.parse(stored) as BusinessProfile;
  } catch {
    // ignore
  }
  return getDefaultBusinessProfile();
}

/** Get business profile from context or localStorage fallback */
export function resolveBusinessProfile(context?: Record<string, unknown>): BusinessProfile {
  if (context?.businessProfile && typeof context.businessProfile === "object") {
    return context.businessProfile as BusinessProfile;
  }
  if (typeof window !== "undefined") {
    return loadBusinessProfile();
  }
  return getDefaultBusinessProfile();
}

/**
 * Fill prompt placeholders with business profile values.
 * Supports: {businessName}, {industry}, {targetAudience}, {productDescription},
 *           {keySellingPoints}, {brandVoice}
 */
export function fillPrompt(template: string, profile: BusinessProfile): string {
  return template
    .replace(/\{businessName\}/g, profile.businessName)
    .replace(/\{industry\}/g, profile.industry)
    .replace(/\{targetAudience\}/g, profile.targetAudience)
    .replace(/\{productDescription\}/g, profile.productDescription)
    .replace(/\{keySellingPoints\}/g, profile.keySellingPoints)
    .replace(/\{brandVoice\}/g, profile.brandVoice);
}
