import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    logger.error("Calendar", "Google OAuth error", { error });
    return NextResponse.redirect(
      new URL("/settings?calendar=error&reason=" + error, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?calendar=error&reason=no_code", request.url)
    );
  }

  try {
    await handleCallback(code);
    return NextResponse.redirect(
      new URL("/settings?calendar=connected", request.url)
    );
  } catch (err) {
    logger.error("Calendar", "Failed to handle Google OAuth callback", { error: String(err) });
    const reason = err instanceof Error ? encodeURIComponent(err.message) : "unknown";
    return NextResponse.redirect(
      new URL(`/settings?calendar=error&reason=${reason}`, request.url)
    );
  }
}
