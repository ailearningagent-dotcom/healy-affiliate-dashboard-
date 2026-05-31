import { NextResponse } from "next/server";
import { disconnectCalendar } from "@/lib/calendar";

export async function POST() {
  try {
    await disconnectCalendar();
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("[Calendar API] Failed to disconnect:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
