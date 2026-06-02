import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findEmailForBusiness } from "@/lib/agents/email-scraper";

const schema = z.object({
  website: z.string().url().or(z.string().min(1)),
  businessName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const email = await findEmailForBusiness(parsed.website, parsed.businessName);
    return NextResponse.json({ email, found: !!email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scrape email" },
      { status: 500 }
    );
  }
}
