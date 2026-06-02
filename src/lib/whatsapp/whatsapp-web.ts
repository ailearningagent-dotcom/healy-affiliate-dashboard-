/**
 * WhatsApp Web Connector — Free WhatsApp messaging via browser automation
 *
 * Uses Puppeteer to launch a browser, navigate to WhatsApp Web,
 * and let the user scan the QR code to connect their business WhatsApp.
 * Once connected, the AI can send follow-up messages automatically.
 *
 * Cost: $0 (uses same Chrome/Puppeteer infrastructure as Google Maps scraping)
 * Limitation: WhatsApp Web must stay connected in the background
 */

import fs from "fs";
import path from "path";
import type { Page, Browser } from "puppeteer-core";
import { withRetry } from "@/lib/utils/retry";
import { logger } from "@/lib/logger";

// ========================================================================
// STORAGE PATHS
// ========================================================================

const DATA_DIR = path.join(process.cwd(), "data", "whatsapp");
const SESSION_DIR = path.join(DATA_DIR, "session");
const QR_PATH = path.join(DATA_DIR, "qr.png");
const SESSION_FILE = path.join(SESSION_DIR, "session.json");
const STORAGE_FILE = path.join(SESSION_DIR, "storage.json");

// ========================================================================
// STATE
// ========================================================================

export type WhatsAppStatus = "disconnected" | "connecting" | "qr_ready" | "connected" | "error";

interface WhatsAppState {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  error: string | null;
}

let _state: WhatsAppState = {
  status: "disconnected",
  qrDataUrl: null,
  phoneNumber: null,
  error: null,
};

// ========================================================================
// BROWSER MANAGEMENT (shared with Google Maps scraper)
// ========================================================================

// We manage the browser ourselves to keep WhatsApp Web session alive
let _browser: Browser | null = null;
let _page: Page | null = null;
let _keepAliveInterval: ReturnType<typeof setInterval> | null = null;

function getChromePath(): string {
  if (process.env.CHROME_PATH) {
    if (fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
    logger.warn("WhatsApp", `CHROME_PATH set but not found: ${process.env.CHROME_PATH}`);
  }
  const paths: Record<string, string[]> = {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    ],
  };
  const candidates = paths[process.platform] || paths.linux;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  logger.warn("WhatsApp", "No Chrome installation found at common paths");
  return candidates[0]; // fallback — will fail at launch with a clear error
}

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  const puppeteer = await import("puppeteer-core");
  _browser = await puppeteer.launch({
    headless: false, // Must be visible for QR scan
    executablePath: getChromePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=800,600",
    ],
    defaultViewport: null,
  });
  return _browser;
}

// ========================================================================
// SESSION PERSISTENCE
// ========================================================================

async function ensureSessionDir(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function saveSession(page: Page): Promise<void> {
  await ensureSessionDir();
  try {
    const cookies = await page.cookies();
    const storageData = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) data[key] = localStorage.getItem(key) || "";
      }
      return data;
    });

    fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookies, savedAt: new Date().toISOString() }));
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ storageData, savedAt: new Date().toISOString() }));
  } catch (e) {
    logger.error("WhatsApp", "Failed to save session", { error: String(e) });
  }
}

async function loadSession(page: Page): Promise<boolean> {
  await ensureSessionDir();
  try {
    if (!fs.existsSync(SESSION_FILE)) return false;

    const data = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
    if (data.cookies && Array.isArray(data.cookies)) {
      await page.setCookie(...data.cookies);
    }

    if (fs.existsSync(STORAGE_FILE)) {
      const storage = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
      const lsData = storage.storageData || storage.localStorage;
      if (lsData) {
        await page.evaluate((ls) => {
          for (const [key, val] of Object.entries(ls)) {
            if (typeof val === "string") localStorage.setItem(key, val);
          }
        }, lsData);
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ========================================================================
// CONNECTION API
// ========================================================================

/**
 * Start the WhatsApp Web connection process.
 * Opens a browser window to WhatsApp Web and monitors for QR or connected state.
 */
export async function connectWhatsApp(): Promise<WhatsAppState> {
  _state = { status: "connecting", qrDataUrl: null, phoneNumber: null, error: null };

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    // Try loading saved session first
    const hasSession = await loadSession(page);

    // Navigate to WhatsApp Web
    await page.goto("https://web.whatsapp.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    _page = page;

    // Monitor login state
    await monitorConnection(page);

    return _state;
  } catch (error) {
    _state = {
      status: "error",
      qrDataUrl: null,
      phoneNumber: null,
      error: error instanceof Error ? error.message : "Failed to connect WhatsApp",
    };
    return _state;
  }
}

/**
 * Monitor WhatsApp Web for QR code or connected state.
 * This runs continuously to keep the connection alive.
 */
async function monitorConnection(page: Page): Promise<void> {
  // Watch for QR code or chat screen
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      // Check if we're on the chat screen (already connected)
      const isConnected = await page.evaluate(() => {
        return (
          document.querySelector('[data-testid="chat-list"]') !== null ||
          document.querySelector('[data-testid="conversation-panel"]') !== null ||
          document.querySelector("canvas") === null
        );
      });

      if (isConnected) {
        // Get the phone number from the profile
        const phoneNumber = await getPhoneNumber(page).catch(() => null);
        _state = { status: "connected", qrDataUrl: null, phoneNumber, error: null };

        // Save session for future reconnects
        await saveSession(page);

        // Start keep-alive
        startKeepAlive(page);
        return;
      }

      // Check for QR code
      const qrData = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        if (canvas) return canvas.toDataURL("image/png");
        return null;
      });

      if (qrData) {
        _state = { status: "qr_ready", qrDataUrl: qrData, phoneNumber: null, error: null };

        // Save QR as image file
        try {
          const base64 = qrData.replace(/^data:image\/png;base64,/, "");
          fs.writeFileSync(QR_PATH, Buffer.from(base64, "base64"));
        } catch {}
      }

      // Also check for "Your session is ready" or "Click to connect" screens
      const needsRefresh = await page.evaluate(() => {
        return document.body.innerText.includes("Click to reload") ||
               document.body.innerText.includes("reconnect");
      });
      if (needsRefresh) {
        await page.reload({ waitUntil: "domcontentloaded" });
        continue;
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      // Page might have changed state, continue monitoring
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // If we didn't connect within the time limit
  if (_state.status !== "connected") {
    _state = {
      status: "error",
      qrDataUrl: _state.qrDataUrl,
      phoneNumber: null,
      error: "Connection timeout. Please try again.",
    };
  }
}

/**
 * Keep the WhatsApp Web session alive by periodically reloading and checking connection.
 */
function startKeepAlive(page: Page): void {
  if (_keepAliveInterval) clearInterval(_keepAliveInterval);

  _keepAliveInterval = setInterval(async () => {
    try {
      const connected = await page.evaluate(() => {
        return (
          document.querySelector('[data-testid="chat-list"]') !== null ||
          document.querySelector('[data-testid="conversation-panel"]') !== null
        );
      });

      if (!connected) {
        logger.warn("WhatsApp", "Connection lost, reconnecting...");
        _state = { ..._state, status: "disconnected" };
        stopKeepAlive();
        // Try to reconnect
        await loadSession(page);
        await page.reload({ waitUntil: "domcontentloaded" });
        await monitorConnection(page);
      }      } catch (e) {
    logger.error("WhatsApp", "Keep-alive failed", { error: String(e) });
    _state = { ..._state, status: "error", error: "Keep-alive failed" };
    stopKeepAlive();
  }
  }, 30000); // Check every 30 seconds
}

function stopKeepAlive(): void {
  if (_keepAliveInterval) {
    clearInterval(_keepAliveInterval);
    _keepAliveInterval = null;
  }
}

/**
 * Get the connected phone number from WhatsApp Web
 */
async function getPhoneNumber(page: Page): Promise<string | null> {
  try {
    // Click on the menu to reveal phone number
    const menuBtn = await page.$('[data-testid="menu"]');
    if (menuBtn) await menuBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    const phone = await page.evaluate(() => {
      const els = document.querySelectorAll('[data-testid="cell-frame-title"]');
      for (const el of els) {
        const text = el.textContent || "";
        if (text.includes("@") || text.includes("@c.us")) {
          return text.replace("@c.us", "");
        }
      }
      return null;
    });

    // Close menu
    await page.keyboard.press("Escape");
    return phone;
  } catch {
    return null;
  }
}

// ========================================================================
// SEND MESSAGE API
// ========================================================================

/**
 * Send a WhatsApp message via the connected WhatsApp Web session.
 * Opens a chat with the target number and sends the message.
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!_page || _state.status !== "connected") {
    return { success: false, error: "WhatsApp not connected. Scan QR code first." };
  }

  try {
    // Format phone number (remove + and non-digits)
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      return { success: false, error: "Invalid phone number" };
    }

    const waId = `${cleanPhone}@c.us`;

    // Use the search box to find/create chat
    const searchBox = await _page.$('[data-testid="chat-list-search"]');
    if (searchBox) {
      await searchBox.click();
      await searchBox.type(cleanPhone, { delay: 50 });
      await new Promise((r) => setTimeout(r, 1000));

      // Click on the first result
      const firstResult = await _page.$('[data-testid="conversation-info"]');
      if (firstResult) {
        await firstResult.click();
      } else {
        // Try clicking on contact
        const contact = await _page.$('[data-testid="cell-frame-container"]');
        if (contact) await contact.click();
      }
    } else {
      // Fallback: try navigating to the chat URL
      await _page.goto(`https://web.whatsapp.com/send?phone=${cleanPhone}`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Type and send the message
    const messageBox = await _page.$('[data-testid="conversation-compose-box-input"]');
    if (!messageBox) {
      return { success: false, error: "Could not open chat with this number" };
    }

    await messageBox.type(message, { delay: 20 });
    await new Promise((r) => setTimeout(r, 500));

    // Click send button
    const sendBtn = await _page.$('[data-testid="compose-btn-send"]');
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await _page.keyboard.press("Enter");
    }

    await new Promise((r) => setTimeout(r, 1000));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message",
    };
  }
}

/**
 * Send WhatsApp message with automatic retry for transient failures.
 */
export async function sendWhatsAppMessageWithRetry(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  return withRetry(() => sendWhatsAppMessage(phoneNumber, message), {
    maxRetries: 2,
    baseDelay: 2000,
    timeout: 30000,
    logger: (msg) => logger.warn("WhatsApp", msg),
  });
}

// ========================================================================
// STATUS & DISCONNECT
// ========================================================================

/**
 * Get the current WhatsApp connection status
 */
export function getWhatsAppStatus(): WhatsAppState {
  return { ..._state };
}

/**
 * Disconnect WhatsApp Web and close the browser
 */
export async function disconnectWhatsApp(): Promise<void> {
  stopKeepAlive();
  try {
    if (_page) {
      await saveSession(_page);
      await _page.close();
      _page = null;
    }
    if (_browser) {
      await _browser.close();
      _browser = null;
    }
  } catch {}
  _state = { status: "disconnected", qrDataUrl: null, phoneNumber: null, error: null };
}

/**
 * Check if WhatsApp is connected and ready
 */
export async function isWhatsAppConnected(): Promise<boolean> {
  return _state.status === "connected";
}
