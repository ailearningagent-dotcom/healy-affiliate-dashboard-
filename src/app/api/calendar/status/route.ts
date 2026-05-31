import { NextResponse } from "next/server";
import { getCalendarStatus } from "@/lib/calendar";

export async function GET() {
  try {
    const status = await getCalendarStatus();
    return NextResponse.json({
      connected: status.connected,
      email: status.email,
      envConfigured: status.envConfigured,
      envError: status.envError,
      error: status.error,
    });
  } catch (error) {
    console.error("[Calendar API] Failed to get status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get calendar status", connected: false },
      { status: 500 }
    );
  }
}
