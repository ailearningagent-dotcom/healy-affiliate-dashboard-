import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, buildNurtureEmail } from "@/lib/email/email-sender";
import { getSetting } from "@/lib/db";

const sendEmailSchema = z.object({
  to: z.string().email("Valid recipient email is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  fromName: z.string().optional(),
  replyTo: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendEmailSchema.parse(body);

    const result = await sendEmail({
      to: parsed.to,
      subject: parsed.subject,
      body: parsed.body,
      fromName: parsed.fromName,
      replyTo: parsed.replyTo,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email", provider: result.provider },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
      message: `Email sent to ${parsed.to}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Email", "Send error", { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}

// Test the email config with a sample email
const testSchema = z.object({
  to: z.string().email(),
});

export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") || "";
  const parsed = testSchema.safeParse({ to });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a valid ?to=email parameter to test", status: "needs_config" },
      { status: 400 }
    );
  }

  try {
    // Build a test email
    const html = buildNurtureEmail({
      leadName: "Test User",
      step: { subject: "Test Email from AI Sales System", template: "This is a test email to verify your email configuration is working correctly." },
      businessName: "AI Sales System",
    });

    const result = await sendEmail({
      to: parsed.data.to,
      subject: html.subject,
      body: html.html,
      textBody: html.text,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        provider: result.provider,
        hint: "Configure email in Settings → Email section",
      });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
      message: "Test email sent successfully!",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    );
  }
}
