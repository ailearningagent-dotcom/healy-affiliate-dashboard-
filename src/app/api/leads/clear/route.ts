import { NextResponse } from "next/server";
import { clearAllData } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    await clearAllData();
    logger.info("ClearData", "All leads, appointments, and sequences deleted");
    return NextResponse.json({ success: true, message: "All data cleared successfully" });
  } catch (error) {
    logger.error("ClearData", "Failed to clear data", { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear data" },
      { status: 500 }
    );
  }
}
