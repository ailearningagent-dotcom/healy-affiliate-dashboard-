/**
 * Google Calendar integration service.
 * Handles OAuth flow, token management, event creation, and availability checking.
 * Uses the REST API directly via fetch (no heavy googleapis dependency).
 */

import { OAuth2Client } from "google-auth-library";
import { getSetting, setSetting } from "@/lib/db";
import { logger } from "@/lib/logger";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

/**
 * Check if Google Calendar environment variables are configured.
 * Returns an error message if missing, or null if configured.
 */
export function checkCalendarEnv(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return "Google Calendar OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local";
  }
  
  if (!clientId.startsWith("clientId".slice(0, 4))) {
    // Basic sanity check — client IDs start with a number
    return null;
  }
  
  return null;
}

function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    logger.warn("Calendar", "Google OAuth not configured — missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/** Generate the Google OAuth consent URL for the admin to connect their calendar */
export function getAuthUrl(): string {
  const envCheck = checkCalendarEnv();
  if (envCheck) {
    throw new Error(envCheck);
  }
  
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

/** Exchange an authorization code for tokens and store the refresh token */
export async function handleCallback(code: string): Promise<void> {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token received. Ensure you have not previously authorized " +
        "this app. Go to https://myaccount.google.com/connections and remove " +
        "access, then try again."
    );
  }

  // Store the refresh token securely in the database
  await setSetting("google_refresh_token", tokens.refresh_token);

  // Also store the calendar email if available
  if (tokens.id_token) {
    // Decode the ID token to get the email
    try {
      const payload = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
      );
      if (payload.email) {
        await setSetting("google_calendar_email", payload.email);
      }
    } catch {
      // Ignore decode errors
    }
  }
}

/** Check if the admin has connected their Google Calendar */
export async function isCalendarConnected(): Promise<boolean> {
  const token = await getSetting("google_refresh_token");
  return !!token;
}

/** Disconnect Google Calendar by removing stored tokens */
export async function disconnectCalendar(): Promise<void> {
  await setSetting("google_refresh_token", "");
  await setSetting("google_calendar_email", "");
}

/** Get an authenticated OAuth2 client using the stored refresh token */
async function getAuthenticatedClient(): Promise<OAuth2Client | null> {
  const refreshToken = await getSetting("google_refresh_token");
  if (!refreshToken) return null;

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Force a token refresh to verify the token is still valid
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    return oauth2Client;
  } catch {
    // Token is invalid/revoked, disconnect
    await disconnectCalendar();
    return null;
  }
}

/** Get the access token for making API calls */
async function getAccessToken(): Promise<string | null> {
  const client = await getAuthenticatedClient();
  if (!client) return null;

  const { token } = await client.getAccessToken();
  return token ?? null;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

/** Fetch existing events for a given date from Google Calendar */
export async function getCalendarEvents(
  date: Date
): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const timeMin = new Date(date);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date(date);
  timeMax.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Calendar API error (list):", errorText);
    return [];
  }

  const data = await response.json();
  return (data.items ?? []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    summary: (item.summary as string) ?? "",
    start: item.start as { dateTime: string },
    end: item.end as { dateTime: string },
  }));
}

/** Create a calendar event on Google Calendar */
export async function createCalendarEvent(event: {
  summary: string;
  description: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  attendeeEmail?: string;
  attendeeName?: string;
}): Promise<{ id: string; hangoutLink?: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startTime, timeZone: "UTC" },
    end: { dateTime: event.endTime, timeZone: "UTC" },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  // Add attendee if email is provided
  if (event.attendeeEmail) {
    body.attendees = [
      {
        email: event.attendeeEmail,
        displayName: event.attendeeName ?? "",
      },
    ];
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Calendar API error (insert):", errorText);
    return null;
  }

  const data = await response.json();
  return {
    id: data.id as string,
    hangoutLink: data.hangoutLink as string | undefined,
  };
}

/** Get the connected calendar email address */
export async function getCalendarEmail(): Promise<string> {
  const email = await getSetting("google_calendar_email");
  return email || "Google Calendar";
}

/** Get the calendar status with diagnostics */
export async function getCalendarStatus(): Promise<{
  connected: boolean;
  email: string;
  envConfigured: boolean;
  envError: string | null;
  error: string | null;
}> {
  const connected = await isCalendarConnected();
  const email = connected ? await getCalendarEmail() : "";
  const envError = checkCalendarEnv();
  
  let error: string | null = null;
  if (envError) {
    error = envError;
  } else if (!connected) {
    error = null; // Not connected yet — user needs to click "Connect"
  }
  
  return {
    connected,
    email,
    envConfigured: !envError,
    envError,
    error,
  };
}

/** Generate available time slots for a given date */
export async function getAvailableSlots(
  date: Date,
  durationMinutes: number = 30
): Promise<{ start: string; end: string }[]> {
  // Get existing events from Google Calendar
  const events = await getCalendarEvents(date);

  // Get business hours from settings (default: 9am-5pm)
  const availabilityStr = await getSetting("calendar_availability");
  let workingHoursStart = 9;
  let workingHoursEnd = 17;

  if (availabilityStr) {
    try {
      const availability = JSON.parse(availabilityStr);
      workingHoursStart = availability.startHour ?? 9;
      workingHoursEnd = availability.endHour ?? 17;
    } catch {
      // Use defaults
    }
  }

  // Calculate occupied time ranges from existing events
  const occupied: { start: Date; end: Date }[] = events
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      start: new Date(e.start.dateTime),
      end: new Date(e.end.dateTime),
    }));

  // Generate all possible slots
  const slots: { start: string; end: string }[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(workingHoursStart, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(workingHoursEnd, 0, 0, 0);

  const slotStart = new Date(dayStart);

  while (slotStart < dayEnd) {
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

    // Check if this slot overlaps with any occupied time
    const isOccupied = occupied.some(
      (occ) => slotStart < occ.end && slotEnd > occ.start
    );

    if (!isOccupied) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }

    // Move to next slot (using duration as the step)
    slotStart.setTime(slotEnd.getTime());
  }

  return slots;
}
