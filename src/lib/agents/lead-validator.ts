/**
 * LeadValidator — Scraped Lead Validation & Skip Logic
 *
 * Validates scraped business leads for completeness before importing.
 * Skips leads that are missing essential data (name, email, phone)
 * or fail validation checks (invalid email format, junk data).
 *
 * Used by: mass-scraper.ts, pipeline-orchestrator.ts, google-maps-scraper.ts
 */

import { logger } from "@/lib/logger";
import type { ScrapedLead } from "./types";

// ========================================================================
// VALIDATION RESULT
// ========================================================================

export interface ValidationResult {
  /** Whether the lead passed all validation checks */
  valid: boolean;
  /** Human-readable reason if skipped (empty string if valid) */
  skipReason: string;
  /** Severity level */
  severity: "pass" | "warn" | "skip";
}

export interface ValidationSummary {
  totalLeads: number;
  validLeads: number;
  skippedLeads: number;
  skippedReasons: Record<string, number>;
  skippedLeadsList: Array<{ name: string; reason: string }>;
}

// ========================================================================
// EMAIL VALIDATION
// ========================================================================

/** Basic email regex — checks for user@domain.tld structure */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Junk/placeholder names to skip */
const JUNK_NAMES = new Set([
  "", " ", "-", "untitled", "unknown", "n/a", "none", "null", "undefined",
  "business", "company", "store", "shop", "service", "test", "listing",
]);

/** Generic/placeholder emails to skip — only truly non-deliverable addresses */
const GENERIC_EMAIL_PATTERNS = [
  /^noreply@/i,
  /^no-reply@/i,
  /^no_reply@/i,
  /^example@/i,
  /^test@/i,
];

// ========================================================================
// VALIDATION FUNCTIONS
// ========================================================================

/**
 * Validate a single scraped lead.
 * Returns whether the lead is valid and why it was skipped if not.
 *
 * Validation rules:
 * 1. Name must exist and not be junk
 * 2. If email exists: must be valid format, not generic/placeholder
 * 3. If phone exists: must match phone pattern (basic check)
 * 4. Skip if BOTH email AND phone are blank (no way to reach out)
 * 5. Skip if score is 0 AND no contact info (likely junk data)
 */
export function validateScrapedLead(lead: ScrapedLead): ValidationResult {
  const name = (lead.name || "").trim();
  const email = (lead.email || "").trim().toLowerCase();
  const phone = (lead.phone || "").trim();

  // --- Name checks ---
  if (!name || name.length < 2 || JUNK_NAMES.has(name.toLowerCase())) {
    return {
      valid: false,
      skipReason: "Missing or invalid business name",
      severity: "skip",
    };
  }

  // --- Contact info checks ---
  const hasEmail = email.length > 0;
  const hasPhone = phone.length > 0;

  // If BOTH email and phone are blank — skip (no way to reach)
  if (!hasEmail && !hasPhone) {
    return {
      valid: false,
      skipReason: "No email or phone — unreachable",
      severity: "skip",
    };
  }

  // --- Email validation (if provided) ---
  if (hasEmail) {
    // Format check
    if (!EMAIL_REGEX.test(email)) {
      return {
        valid: false,
        skipReason: `Invalid email format: ${email}`,
        severity: "skip",
      };
    }

    // Non-deliverable/sink email check (noreply, example, test — NOT info/hello/contact which are valid business emails)
    const isNonDeliverable = GENERIC_EMAIL_PATTERNS.some((p) => p.test(email));
    if (isNonDeliverable) {
      return {
        valid: false,
        skipReason: `Non-deliverable email (${email})`,
        severity: "skip",
      };
    }
  }

  // --- Phone validation (if provided, basic check) ---
  if (hasPhone && phone.length < 6) {
    return {
      valid: false,
      skipReason: `Phone number too short: ${phone}`,
      severity: "skip",
    };
  }

  // --- Score check: if score is 0 and we have no contact info, it's junk ---
  if (lead.score === 0 && !hasEmail && !hasPhone) {
    return {
      valid: false,
      skipReason: "Zero score + no contact info — likely junk data",
      severity: "skip",
    };
  }

  // --- Passed all checks ---
  return {
    valid: true,
    skipReason: "",
    severity: "pass",
  };
}

/**
 * Validate a batch of leads and return filtered + summary.
 * This is the main function used by mass-scraper and pipeline-orchestrator.
 */
export function validateAndFilterLeads(
  leads: ScrapedLead[]
): {
  validLeads: ScrapedLead[];
  skippedLeads: ScrapedLead[];
  summary: ValidationSummary;
} {
  const validLeads: ScrapedLead[] = [];
  const skippedLeads: ScrapedLead[] = [];
  const skippedReasons: Record<string, number> = {};
  const skippedLeadsList: Array<{ name: string; reason: string }> = [];

  for (const lead of leads) {
    const result = validateScrapedLead(lead);

    if (result.valid) {
      validLeads.push(lead);
    } else {
      skippedLeads.push(lead);
      skippedReasons[result.skipReason] = (skippedReasons[result.skipReason] || 0) + 1;
      skippedLeadsList.push({ name: lead.name || "(unnamed)", reason: result.skipReason });
    }
  }

  const summary: ValidationSummary = {
    totalLeads: leads.length,
    validLeads: validLeads.length,
    skippedLeads: skippedLeads.length,
    skippedReasons,
    skippedLeadsList,
  };

  return { validLeads, skippedLeads, summary };
}

/**
 * Log a validation summary (useful after a scrape batch).
 */
export function logValidationSummary(
  context: string,
  summary: ValidationSummary
): void {
  if (summary.totalLeads === 0) {
    logger.info("LeadValidator", `${context}: No leads to validate`);
    return;
  }

  const msg = `${context}: ${summary.validLeads}/${summary.totalLeads} valid, ${summary.skippedLeads} skipped`;
  logger.info("LeadValidator", msg);

  if (summary.skippedLeads > 0) {
    const reasons = Object.entries(summary.skippedReasons)
      .map(([reason, count]) => `  - ${count}x: ${reason}`)
      .join("\n");
    logger.info("LeadValidator", `Skip reasons:\n${reasons}`);
  }
}

/**
 * Check if a lead is complete enough for immediate engagement.
 * (Has both email AND name, or phone AND name)
 */
export function isLeadEngageable(lead: ScrapedLead): boolean {
  const name = (lead.name || "").trim().length >= 2;
  const email = (lead.email || "").trim().length > 0;
  const phone = (lead.phone || "").trim().length > 0;
  return name && (email || phone);
}

/**
 * Dummy score for leads that have no score yet.
 * Uses rating/reviews to derive a rough score.
 */
export function computeScrapedLeadScore(lead: ScrapedLead): number {
  let score = 50; // Base score

  // Has email → +15
  if (lead.email) score += 15;

  // Has phone → +10
  if (lead.phone) score += 10;

  // Has rating → up to +15
  if (lead.rating) {
    const rating = parseFloat(lead.rating);
    if (!isNaN(rating)) score += Math.round(rating * 3);
  }

  // Has reviews → up to +10
  if (lead.reviews) {
    const reviews = parseInt(lead.reviews.replace(/,/g, ""), 10);
    if (!isNaN(reviews)) {
      if (reviews > 100) score += 10;
      else if (reviews > 50) score += 5;
    }
  }

  // Has website → +5
  if (lead.sourceUrl) score += 5;

  // Has address → +3
  if (lead.address) score += 3;

  // Has category → +2
  if (lead.category) score += 2;

  return Math.min(Math.round(score), 100);
}
