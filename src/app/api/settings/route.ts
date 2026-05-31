import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { z } from "zod";

const setSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json(
      { error: "key query parameter is required" },
      { status: 400 }
    );
  }

  const value = await getSetting(key);
  return NextResponse.json({ key, value });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = setSettingSchema.parse(body);
    await setSetting(parsed.key, parsed.value);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set setting" },
      { status: 500 }
    );
  }
}
