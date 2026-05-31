import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
  sendWhatsAppMessage,
} from "@/lib/whatsapp/whatsapp-web";

/**
 * GET /api/whatsapp — Get connection status
 * Query params: ?action=status
 */
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") || "status";

  switch (action) {
    case "status": {
      const status = getWhatsAppStatus();
      return NextResponse.json({
        status: status.status,
        qrDataUrl: status.qrDataUrl,
        phoneNumber: status.phoneNumber,
        error: status.error,
      });
    }

    case "qr": {
      const status = getWhatsAppStatus();
      if (status.qrDataUrl) {
        // Return the QR code as an image
        const base64 = status.qrDataUrl.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "no-cache",
          },
        });
      }
      return NextResponse.json(
        { error: "QR code not available. Connect first." },
        { status: 404 }
      );
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

/**
 * POST /api/whatsapp — Control WhatsApp connection
 * Body: { action: "connect" | "disconnect" | "send", phoneNumber?: string, message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    switch (action) {
      case "connect": {
        // Don't wait for connection — it's async
        connectWhatsApp().catch((err) => {
          logger.error("WhatsApp", "Connection error", { error: String(err) });
        });
        return NextResponse.json({
          success: true,
          message: "WhatsApp Web connection initiated. Check status for QR code.",
        });
      }

      case "disconnect": {
        await disconnectWhatsApp();
        return NextResponse.json({
          success: true,
          message: "WhatsApp disconnected.",
        });
      }

      case "send": {
        const sendSchema = z.object({
          phoneNumber: z.string().min(1, "Phone number is required"),
          message: z.string().min(1, "Message is required"),
        });
        const parsed = sendSchema.parse(body);
        const result = await sendWhatsAppMessage(parsed.phoneNumber, parsed.message);
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || "Failed to send message" },
            { status: 500 }
          );
        }
        return NextResponse.json({
          success: true,
          message: "WhatsApp message sent.",
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
