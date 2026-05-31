import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/calendar";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const url = getAuthUrl();
    logger.info("Calendar", "Redirecting to Google OAuth consent screen");
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate auth URL";
    logger.error("Calendar", "Auth URL generation failed", { error: message });
    // Redirect to settings with error info
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(
      new URL(`/settings?calendar=error&reason=${encodeURIComponent(message)}`, baseUrl)
    );
  }
}
