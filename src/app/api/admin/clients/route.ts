import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listClients, createClient, getClientBySlug } from "@/lib/db";

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  email: z.string().email("Invalid email").optional().default(""),
  company: z.string().optional().default(""),
  primaryColor: z.string().optional().default("#6366f1"),
});

export async function GET() {
  try {
    const clients = await listClients();
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createClientSchema.parse(body);

    // Check slug uniqueness
    const existing = await getClientBySlug(parsed.slug);
    if (existing) {
      return NextResponse.json(
        { error: "A client with this slug already exists" },
        { status: 409 }
      );
    }

    const client = await createClient(parsed);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create client" },
      { status: 500 }
    );
  }
}
