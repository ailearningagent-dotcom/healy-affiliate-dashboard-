/**
 * Email Personalizer — Injects scraped business details into nurture email templates.
 *
 * Takes a template with placeholders like {company}, {category}, {rating}, {reviews},
 * {address}, {businessDetails}, {website}, {score} and replaces them with the
 * lead's actual scraped data.
 *
 * If a placeholder has no data available, it's gracefully removed from the template.
 */

import type { Lead } from "./types";

// ========================================================================
// PLACEHOLDER DEFINITIONS
// ========================================================================

export interface LeadScrapedContext {
  company: string;
  category: string;
  rating: string;
  reviews: string;
  address: string;
  businessDetails: string;
  website: string;
  score: string;
}

/**
 * Extract scraped business context from a lead record.
 * Falls back gracefully if fields are empty.
 */
export function getLeadContext(lead: Lead): LeadScrapedContext {
  return {
    company: lead.company || lead.name || "",
    category: extractCategoryFromNotes(lead.notes) || "",
    rating: extractRatingFromNotes(lead.notes) || "",
    reviews: extractReviewsFromNotes(lead.notes) || "",
    address: extractAddressFromNotes(lead.notes) || "",
    businessDetails: lead.notes || "",
    website: lead.sourceUrl || "",
    score: String(lead.score || ""),
  };
}

/**
 * Inject scraped lead data into an email template.
 * Replaces all {placeholders} with actual data from the lead.
 * Gracefully removes placeholders that have no data.
 */
export function injectLeadData(
  template: string,
  lead: Lead
): string {
  const ctx = getLeadContext(lead);

  // Replace each placeholder with its value (or empty string if no data)
  let result = template;

  const replacements: Record<string, string> = {
    "{company}": ctx.company,
    "{category}": ctx.category,
    "{rating}": ctx.rating,
    "{reviews}": ctx.reviews,
    "{address}": ctx.address,
    "{businessDetails}": ctx.businessDetails,
    "{website}": ctx.website,
    "{score}": ctx.score,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    if (value) {
      result = result.replaceAll(placeholder, value);
    } else {
      // Remove the placeholder entirely (e.g., " at {address}" → " at ")
      result = result.replaceAll(placeholder, "");
    }
  }

  // Clean up double spaces and trailing/leading whitespace from removed placeholders
  result = result
    .replace(/  +/g, " ")       // Multiple spaces → single space
    .replace(/,\s*,/g, ",")     // Double commas → single comma
    .replace(/\n\s{3,}/g, "\n") // Excessive indentation
    .trim();

  return result;
}

// ========================================================================
// NOTES PARSING — Extract scraped fields from the notes string
// ========================================================================

/**
 * The `notes` field stores scraped data in a pipe-delimited format like:
 * "4.5★ | Category: Wellness Center | Located at: 123 Main St | Phone: ... | Web: ..."
 *
 * These helpers extract individual fields from that string.
 */

export function extractRatingFromNotes(notes: string): string {
  if (!notes) return "";
  // Matches patterns like "4.5★" or "3.9★ (127 reviews)"
  const match = notes.match(/(\d+\.?\d*)★/);
  return match ? match[1] : "";
}

export function extractReviewsFromNotes(notes: string): string {
  if (!notes) return "";
  // Matches patterns like "127 reviews" or "(127 reviews)" after the star
  const match = notes.match(/★\s*(?:\((\d+(?:,\d+)*)\s*reviews?\))?/);
  if (match && match[1]) return match[1].replace(/,/g, "");
  // Also try: "127 reviews" standalone
  const standalone = notes.match(/(\d+(?:,\d+)*)\s*reviews?/i);
  return standalone ? standalone[1].replace(/,/g, "") : "";
}

export function extractAddressFromNotes(notes: string): string {
  if (!notes) return "";
  const match = notes.match(/Located at:\s*(.+?)(?:\||$)/);
  return match ? match[1].trim() : "";
}

export function extractCategoryFromNotes(notes: string): string {
  if (!notes) return "";
  const match = notes.match(/Category:\s*(.+?)(?:\||$)/);
  return match ? match[1].trim() : "";
}
