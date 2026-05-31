import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots, isCalendarConnected } from "@/lib/calendar";
import { getSetting } from "@/lib/db";

export async function GET(request: NextRequest) {
  const dateStr = request.nextUrl.searchParams.get("date");
  if (!dateStr) {
    return NextResponse.json(
      { error: "Date parameter is required (format: YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  // Only allow booking in the future (today or later)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return NextResponse.json({ slots: [] });
  }

  // Get meeting duration from settings (default 30 min)
  const durationStr = await getSetting("calendar_meeting_duration");
  const duration = durationStr ? parseInt(durationStr, 10) : 30;

  const connected = await isCalendarConnected();

  try {
    const slots = await getAvailableSlots(date, duration);
    return NextResponse.json({ slots, connected });
  } catch (error) {
    logger.error("Booking", "Failed to get available slots", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get available time slots" },
      { status: 500 }
    );
  }
}
