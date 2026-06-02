import { NextResponse } from "next/server";
import { dbList, dbUpdate } from "@/lib/db";
import { logger } from "@/lib/logger";
import { extractRatingFromNotes, extractReviewsFromNotes, extractAddressFromNotes, extractCategoryFromNotes } from "@/lib/agents/email-personalizer";
import type { Lead } from "@/lib/agents/types";

/**
 * POST /api/leads/reparse
 *
 * Bulk re-parse all existing leads' notes fields to extract and normalize
 * enriched scraped data (rating, reviews, address, category).
 *
 * For each lead:
 *   1. Parse existing notes with the extraction helpers
 *   2. If scraped data is found, rewrite notes in the standardized
 *      pipe-delimited format so parsers work reliably
 *   3. Save the updated lead
 *
 * Returns a summary of what was found and updated.
 */
export async function POST() {
  try {
    const leads = await dbList<Lead>("leads");

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        totalLeads: 0,
        updated: 0,
        breakdown: { withRating: 0, withCategory: 0, withAddress: 0, withReviews: 0 },
        message: "No leads to re-parse.",
      });
    }

    let updated = 0;
    let withRating = 0;
    let withCategory = 0;
    let withAddress = 0;
    let withReviews = 0;
    const details: Array<{ name: string; rating: string; category: string; address: string }> = [];

    for (const lead of leads) {
      const notes = lead.notes || "";
      const rating = extractRatingFromNotes(notes);
      const reviews = extractReviewsFromNotes(notes);
      const address = extractAddressFromNotes(notes);
      const category = extractCategoryFromNotes(notes);

      if (rating) withRating++;
      if (reviews) withReviews++;
      if (address) withAddress++;
      if (category) withCategory++;

      const hasScrapedData = !!(rating || reviews || address || category);

      if (hasScrapedData) {
        // Rewrite notes in standardized format if scraped data found
        const searchQuery = notes.match(/Google Maps lead — "([^"]+)"/)?.[1] || "google maps";
        const parts: string[] = [`Google Maps lead — "${searchQuery}".`];

        if (rating) {
          parts.push(`${rating}★${reviews ? ` (${reviews} reviews)` : ""}`);
        }
        if (category) parts.push(`Category: ${category}`);
        if (address) parts.push(`Located at: ${address}`);

        // Preserve phone and website from existing notes if present
        const phoneMatch = notes.match(/Phone:\s*(.+?)(?:\||$)/);
        if (phoneMatch) parts.push(`Phone: ${phoneMatch[1].trim()}`);

        const webMatch = notes.match(/Web:\s*(.+?)(?:\||$)/);
        if (webMatch) parts.push(`Web: ${webMatch[1].trim()}`);

        const standardized = parts.join(" | ");

        if (standardized !== notes) {
          await dbUpdate<Lead>("leads", lead.id, {
            notes: standardized,
            // Re-derive personaType from category if available
            ...(category && !lead.personaType?.match(/^(customer|wellness-seeker|practitioner|biohacker|business-builder)$/)
              ? { persona_type: inferPersonaFromCategory(category) }
              : {}),
          });
          updated++;
        }

        details.push({
          name: lead.name,
          rating: rating || "",
          category: category || "",
          address: address || "",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalLeads: leads.length,
      updated,
      breakdown: { withRating, withReviews, withAddress, withCategory },
      details: details.slice(0, 50), // First 50 for preview
      message: `Re-parsed ${updated}/${leads.length} leads. Found: ${withRating} ratings, ${withCategory} categories, ${withAddress} addresses, ${withReviews} review counts.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("ReparseAPI", `Re-parse failed: ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * Infer a persona type from a Google Maps category string.
 */
function inferPersonaFromCategory(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("clinic") || c.includes("medical") || c.includes("doctor") || c.includes("therapist") || c.includes("chiropractor")) {
    return "practitioner";
  }
  if (c.includes("gym") || c.includes("fitness") || c.includes("yoga") || c.includes("spa") || c.includes("salon")) {
    return "wellness-seeker";
  }
  if (c.includes("studio") || c.includes("shop") || c.includes("store") || c.includes("market")) {
    return "business-builder";
  }
  return "customer";
}
