/**
 * Email Sender — Zero-cost email delivery via Gmail SMTP (free, 500 emails/day)
 * Also supports Resend API (free tier: 100 emails/day) and SendGrid (free tier: 100 emails/day).
 *
 * The system auto-detects which provider to use based on configured credentials.
 * Priority: Gmail SMTP > Resend > SendGrid > console (fallback)
 */

import nodemailer from "nodemailer";
import { getSetting } from "@/lib/db";
import { withRetry } from "@/lib/utils/retry";
import { logger } from "@/lib/logger";

// ========================================================================
// CONFIGURATION
// ========================================================================

export interface EmailConfig {
  provider: "gmail_smtp" | "resend" | "sendgrid" | "none";
  gmailUser?: string;       // Gmail address
  gmailAppPassword?: string; // Gmail App Password (not regular password)
  resendApiKey?: string;
  sendgridApiKey?: string;
  fromName: string;
  fromEmail: string;
}

const DEFAULT_FROM_NAME = "AI Sales Agent";
const DEFAULT_FROM_EMAIL = "noreply@yourbusiness.com";

// ========================================================================
// PROVIDER IMPLEMENTATIONS
// ========================================================================

let _transporter: nodemailer.Transporter | null = null;

async function getConfig(): Promise<EmailConfig> {
  const [provider, gmailUser, gmailPass, resendKey, sendgridKey, fromName, fromEmail] =
    await Promise.all([
      getSetting("email_provider"),
      getSetting("email_gmail_user"),
      getSetting("email_gmail_app_password"),
      getSetting("email_resend_api_key"),
      getSetting("email_sendgrid_api_key"),
      getSetting("email_from_name"),
      getSetting("email_from_email"),
    ]);

  return {
    provider: (provider as EmailConfig["provider"]) || (process.env.EMAIL_GMAIL_USER ? "gmail_smtp" as const : "none"),
    gmailUser: gmailUser || process.env.EMAIL_GMAIL_USER || undefined,
    gmailAppPassword: gmailPass || process.env.EMAIL_GMAIL_APP_PASSWORD || undefined,
    resendApiKey: resendKey || process.env.RESEND_API_KEY || undefined,
    sendgridApiKey: sendgridKey || process.env.SENDGRID_API_KEY || undefined,
    fromName: fromName || process.env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME,
    fromEmail: fromEmail || process.env.EMAIL_FROM_EMAIL || DEFAULT_FROM_EMAIL,
  };
}

async function createTransporter(config: EmailConfig): Promise<nodemailer.Transporter | null> {
  if (config.provider === "gmail_smtp" && config.gmailUser && config.gmailAppPassword) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: config.gmailUser, pass: config.gmailAppPassword },
    });
  }
  return null;
}

// ========================================================================
// SEND FUNCTION
// ========================================================================

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;       // HTML body
  textBody?: string;  // Plain text fallback
  fromName?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using the configured provider.
 * Returns { success: true/false, provider, messageId?, error? }
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const config = await getConfig();

  if (config.provider === "none") {
    logger.info("Email", `Skipping email to ${message.to} — no provider configured (subject: "${message.subject}")`);
    return { success: false, provider: "none", error: "No email provider configured" };
  }

  if (config.provider === "gmail_smtp") {
    return sendViaGmailSmtp(message, config);
  }

  if (config.provider === "resend" && config.resendApiKey) {
    return sendViaResend(message, config);
  }

  if (config.provider === "sendgrid" && config.sendgridApiKey) {
    return sendViaSendGrid(message, config);
  }

  // Fallback: no valid provider credentials
  logger.info("Email", `No valid provider credentials found. Would send to ${message.to}: "${message.subject}"`);
  return { success: false, provider: "none", error: `Provider "${config.provider}" not configured (missing API key)` };
}

/**
 * Send email with automatic retry for transient failures.
 * Uses exponential backoff — 3 attempts with 1s/2s/4s delays.
 */
export async function sendEmailWithRetry(message: EmailMessage): Promise<EmailResult> {
  return withRetry(() => sendEmail(message), {
    maxRetries: 2,
    baseDelay: 1000,
    timeout: 15000,
    logger: (msg) => logger.warn("Email", msg),
  });
}

// ========================================================================
// GMAIL SMTP (Free: 500 emails/day)
// ========================================================================

async function sendViaGmailSmtp(
  message: EmailMessage,
  config: EmailConfig
): Promise<EmailResult> {
  try {
    const transporter = await createTransporter(config);
    if (!transporter) {
      return { success: false, provider: "gmail_smtp", error: "Gmail SMTP not configured" };
    }

    const info = await transporter.sendMail({
      from: `"${message.fromName || config.fromName}" <${config.gmailUser}>`,
      to: message.to,
      subject: message.subject,
      html: message.body,
      text: message.textBody || message.body.replace(/<[^>]*>/g, ""),
      replyTo: message.replyTo,
    });

    return {
      success: true,
      provider: "gmail_smtp",
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      success: false,
      provider: "gmail_smtp",
      error: error instanceof Error ? error.message : "Unknown SMTP error",
    };
  }
}

// ========================================================================
// RESEND API (Free: 100 emails/day)
// ========================================================================

async function sendViaResend(
  message: EmailMessage,
  config: EmailConfig
): Promise<EmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `"${message.fromName || config.fromName}" <${config.fromEmail}>`,
        to: [message.to],
        subject: message.subject,
        html: message.body,
        text: message.textBody || message.body.replace(/<[^>]*>/g, ""),
        reply_to: message.replyTo,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, provider: "resend", error: data.message || "Resend API error" };
    }
    return { success: true, provider: "resend", messageId: data.id };
  } catch (error) {
    return {
      success: false,
      provider: "resend",
      error: error instanceof Error ? error.message : "Resend API error",
    };
  }
}

// ========================================================================
// SENDGRID API (Free: 100 emails/day)
// ========================================================================

async function sendViaSendGrid(
  message: EmailMessage,
  config: EmailConfig
): Promise<EmailResult> {
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: config.fromEmail, name: message.fromName || config.fromName },
        subject: message.subject,
        content: [
          { type: "text/html", value: message.body },
          { type: "text/plain", value: message.textBody || message.body.replace(/<[^>]*>/g, "") },
        ],
        reply_to: message.replyTo ? { email: message.replyTo } : undefined,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, provider: "sendgrid", error: text || "SendGrid error" };
    }
    return { success: true, provider: "sendgrid" };
  } catch (error) {
    return {
      success: false,
      provider: "sendgrid",
      error: error instanceof Error ? error.message : "SendGrid error",
    };
  }
}

// ========================================================================
// EMAIL TEMPLATES
// ========================================================================

/**
 * Generate a professional HTML email with branding
 */
export function buildEmailHtml(
  content: string,
  options?: { businessName?: string; ctaText?: string; ctaLink?: string }
): string {
  const businessName = options?.businessName || "AI Sales Agent";
  const ctaText = options?.ctaText;
  const ctaLink = options?.ctaLink;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 32px 0;">
  <table align="center" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <tr>
      <td style="padding: 32px 32px 16px;">
        <div style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 24px;">${businessName}</div>
        <div style="color: #374151; line-height: 1.6; font-size: 15px;">
          ${content}
        </div>
        ${ctaText && ctaLink ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${ctaLink}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            ${ctaText}
          </a>
        </div>` : ""}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This message was sent by the AI Sales System. To manage notifications, visit your settings.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build an appointment confirmation email
 */
export function buildAppointmentEmail(params: {
  leadName: string;
  businessName: string;
  dateTime: Date;
  duration: number;
  meetLink?: string;
}): { subject: string; html: string; text: string } {
  const dateStr = params.dateTime.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = params.dateTime.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  const html = buildEmailHtml(`
    <p>Hi <strong>${params.leadName}</strong>,</p>
    <p>Your consultation with <strong>${params.businessName}</strong> has been confirmed!</p>
    
    <table style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; width: 100%;">
      <tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Date</td><td style="font-weight: 600;">${dateStr}</td></tr>
      <tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Time</td><td style="font-weight: 600;">${timeStr}</td></tr>
      <tr><td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Duration</td><td style="font-weight: 600;">${params.duration} minutes</td></tr>
    </table>
    
    ${params.meetLink ? `<p>Join via Google Meet: <a href="${params.meetLink}">${params.meetLink}</a></p>` : ""}
    
    <p>If you need to reschedule, simply reply to this email.</p>
    <p>We look forward to speaking with you!</p>
  `, { businessName: params.businessName });

  const text = `Hi ${params.leadName},\n\nYour consultation with ${params.businessName} has been confirmed!\n\nDate: ${dateStr}\nTime: ${timeStr}\nDuration: ${params.duration} minutes\n\n${params.meetLink ? `Join: ${params.meetLink}\n\n` : ""}If you need to reschedule, simply reply to this email.`;

  return { subject: `✅ Confirmed: Consultation with ${params.businessName}`, html, text };
}

/**
 * Build a nurture follow-up email
 */
export function buildNurtureEmail(params: {
  leadName: string;
  step: { subject?: string; template: string };
  businessName: string;
  bookingLink?: string;
}): { subject: string; html: string; text: string } {
  const html = buildEmailHtml(`
    <p>Hi <strong>${params.leadName}</strong>,</p>
    ${params.step.template.split("\n").map(p => `<p>${p}</p>`).join("")}
    ${params.bookingLink ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.bookingLink}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Book a Free Consultation
      </a>
    </div>` : ""}
  `, { businessName: params.businessName, ctaText: "Book a Free Consultation", ctaLink: params.bookingLink });

  const text = `Hi ${params.leadName},\n\n${params.step.template}\n\n${params.bookingLink ? `Book a consultation: ${params.bookingLink}\n\n` : ""}`;

  return { subject: params.step.subject || `Follow-up from ${params.businessName}`, html, text };
}
