import fs from "fs";
import { logger } from "@/lib/logger";
import { findEmailForBusiness } from "@/lib/agents/email-scraper";
import type { ScrapedLead } from "./types";

function getChromePath(): string {
  if (process.env.CHROME_PATH) {
    if (fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  }
  // Cross-platform Chrome/Chromium detection
  const paths: Record<string, string[]> = {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ],
  };
  const platformPaths = paths[process.platform] || paths.linux;
  for (const candidate of platformPaths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return platformPaths[0];
}

export interface GoogleMapsScrapeParams {
  query: string;
  location?: string;
  maxResults: number;
}

/**
 * Scrape Google Maps for businesses matching a search query + location.
 * Uses Puppeteer to launch a Chrome browser, navigates to Google Maps,
 * scrolls through results, and extracts structured lead data.
 *
 * v3 improvements:
 * - Cookie consent popup dismissal (Google's various consent dialogs)
 * - Updated CSS selectors for current Google Maps DOM (obfuscated class names)
 * - Robust attribute-based selectors (aria-label, jsaction, data-item-id)
 * - Better error recovery — proceeds even if some cards fail
 * - Improved email enrichment with domain-based fallback
 */
export async function scrapeGoogleMaps(
  params: GoogleMapsScrapeParams
): Promise<ScrapedLead[]> {
  const { query, location, maxResults } = params;
  const searchQuery = location ? `${query} ${location}` : query;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}/`;

  let browser;
  try {
    const puppeteer = await import("puppeteer-core");
    browser = await puppeteer.launch({
      headless: false, // Non-headless avoids detection
      executablePath: getChromePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();
    // Override webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    );

    // Navigate to Google Maps search
    // Use a race between goto and waitForNavigation to handle redirects
    logger.info("GoogleMapsScraper", `Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait for the page to fully settle after any redirects
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));
    // Ensure network is idle
    try {
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 10000 });
    } catch {
      // Network may not fully idle — proceed anyway
    }

    // ====================================================================
    // STEP 1: Dismiss any cookie consent / privacy dialogs
    // ====================================================================
    await dismissCookieConsent(page);

    // ====================================================================
    // STEP 2: Wait for search results to render
    // ====================================================================
    // Google Maps loads dynamically — try multiple selectors (both old and new)
    const resultSelectors = [
      '[role="feed"]',                              // Current stable selector for results list
      'div[role="main"]',                           // Main content area
      'div[aria-label*="Results"]',                 // Results container label
      'div[jsaction*="mouseover"]',                 // Modern Maps uses jsaction on result cards
      'div[class*="m6QErb"]',                       // Older fallback class
      'div[class*="Nv2PK"]',                        // Older result card class
    ];

    let foundResults = false;
    for (const sel of resultSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 6000 });
        foundResults = true;
        break;
      } catch {
        continue;
      }
    }

    if (!foundResults) {
      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: "gmaps-debug.png", fullPage: false });
      } catch {}
      logger.warn("GoogleMapsScraper", "Could not find results container — page might have loaded differently");
    }

    // Give Maps time to render lazy-loaded content
    await page.evaluate(() => new Promise((r) => setTimeout(r, 3000)));

    // ====================================================================
    // STEP 3: Scroll to load more results
    // ====================================================================
    await scrollResultsPanel(page, maxResults);

    // Wait for lazy-loaded content after scrolling
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));

    // ====================================================================
    // STEP 4: Extract leads
    // ====================================================================
    const leads = await extractLeadsFromPage(page, maxResults, searchQuery);

    logger.info("GoogleMapsScraper", `Extracted ${leads.length} leads from Google Maps`);

    // ====================================================================
    // STEP 5: Enrich with emails from websites
    // ====================================================================
    const enriched = await enrichLeadsWithEmails(leads);
    logger.info("GoogleMapsScraper", `Enriched ${enriched.filter((l) => l.email).length} leads with emails`);
    return enriched;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("GoogleMapsScraper", `Scrape error: ${message}`);
    throw new Error(`Google Maps scrape failed: ${message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

// ====================================================================
// COOKIE CONSENT / PRIVACY DIALOG HANDLING
// ====================================================================

/**
 * Dismiss any cookie consent, privacy, or "Before you continue" dialogs
 * that Google Maps may show. Handles multiple dialog variants.
 */
async function dismissCookieConsent(page: import("puppeteer-core").Page): Promise<void> {
  try {
    // Wait a moment for any dialog to appear
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

    const dismissed = await page.evaluate(() => {
      // Collect ALL buttons on the page and check their text content
      // This avoids :contains() which is not a native CSS pseudo-class
      const allButtons = Array.from(document.querySelectorAll("button"));

      for (const btn of allButtons) {
        const text = btn.textContent?.toLowerCase().trim() || "";

        // Exact-match consent buttons only (no partial matches)
        if (
          text === "accept all" ||
          text === "i agree" ||
          text === "got it" ||
          text === "agree" ||
          text === "reject all" ||
          text === "reject" ||
          text === "stay signed out"
        ) {
          (btn as HTMLButtonElement).click();
          return true;
        }
      }

      // Fallback: look for dialogs and click their primary action button
      const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"]');
      for (const dialog of dialogs) {
        const dialogButtons = dialog.querySelectorAll("button");
        for (const btn of dialogButtons) {
          const text = btn.textContent?.toLowerCase().trim() || "";
          if (
            text === "accept all" ||
            text === "i agree" ||
            text === "got it" ||
            text === "agree" ||
            text === "reject all" ||
            text.includes("accept") ||
            text.includes("agree") ||
            text.includes("got it")
          ) {
            (btn as HTMLButtonElement).click();
            return true;
          }
        }
      }

      return false;
    });

    if (dismissed) {
      logger.info("GoogleMapsScraper", "Dismissed cookie consent dialog");
      // Wait for dialog to close
      await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)));
    }
  } catch {
    // Cookie dismissal failed silently — proceed anyway
    logger.warn("GoogleMapsScraper", "Failed to dismiss cookie consent (non-critical)");
  }
}

// ====================================================================
// SCROLLING
// ====================================================================

/**
 * Scroll the Google Maps results panel to trigger infinite-load of more results.
 */
async function scrollResultsPanel(
  page: import("puppeteer-core").Page,
  maxResults: number
): Promise<void> {
  const scrollIterations = Math.min(Math.ceil(maxResults / 3), 15);

  for (let i = 0; i < scrollIterations; i++) {
    try {
      const didScroll = await page.evaluate(() => {
        // Strategy 1: Scrollable panel with role="feed" (current Google Maps)
        const feed = document.querySelector('[role="feed"]');
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
          return true;
        }

        // Strategy 2: Panel with scrollable content
        const panel = document.querySelector(
          'div[class*="m6QErb"], div[aria-label*="Results"], div[role="main"]'
        );
        if (panel && panel.scrollHeight > panel.clientHeight) {
          panel.scrollTop = panel.scrollHeight;
          return true;
        }

        // Strategy 3: Try to find the left sidebar scroll container
        const scrollable = Array.from(document.querySelectorAll("div")).find(
          (d) =>
            d.scrollHeight > d.clientHeight + 50 &&
            getComputedStyle(d).overflowY === "scroll"
        );
        if (scrollable) {
          scrollable.scrollTop = scrollable.scrollHeight;
          return true;
        }

        // Fallback: scroll the whole page
        window.scrollBy(0, 800);
        return true;
      });

      if (!didScroll) break;
      await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));
    } catch {
      break;
    }
  }
}

// ====================================================================
// EXTRACTION
// ====================================================================

/**
 * Extract business leads from the current Google Maps page.
 * Strategy: click each card to open the detail panel and extract rich data.
 * Falls back to card-level extraction if clicking fails.
 */
async function extractLeadsFromPage(
  page: import("puppeteer-core").Page,
  maxResults: number,
  searchQuery: string
): Promise<ScrapedLead[]> {
  // Step 1: Get clickable result elements using robust selectors
  const clickSelectors = [
    'a[href*="/maps/place"]',                           // Direct place links
    'div[role="feed"] > div[jsaction]',                 // Modern feed > action cards
    'div[role="feed"] > div[role="article"]',           // feed > article
    'div[jsaction*="mouseover"]',                       // Cards with mouseover actions
    'a[data-result-index]',                              // Indexed result links
    'div[class*="Nv2PK"]',                              // Older card class
  ];

  let cardElements: import("puppeteer-core").ElementHandle[] = [];
  for (const sel of clickSelectors) {
    cardElements = await page.$$(sel);
    if (cardElements.length > 0) {
      logger.info("GoogleMapsScraper", `Found ${cardElements.length} cards via selector: ${sel}`);
      break;
    }
  }

  // If no clickable cards found, fall back to inline data extraction
  if (cardElements.length === 0) {
    logger.warn("GoogleMapsScraper", "No clickable cards found — falling back to aria/text extraction");
    const fromAria = await extractFromAriaLabels(page);
    if (fromAria.length > 0) return formatLeads(fromAria.slice(0, maxResults), searchQuery);
    const fromText = await extractFromAllText(page);
    return formatLeads(fromText.slice(0, maxResults), searchQuery);
  }

  // Step 2: Click each card and extract from the detail panel
  const allData: Array<{
    name: string; rating: string; reviews: string;
    address: string; category: string; phone: string; website: string;
  }> = [];

  const limit = Math.min(cardElements.length, maxResults);
  for (let i = 0; i < limit; i++) {
    try {
      // Re-query elements to avoid stale references (DOM may have changed after each click)
      let freshElements: import("puppeteer-core").ElementHandle[] = [];
      for (const sel of clickSelectors) {
        freshElements = await page.$$(sel);
        if (freshElements.length > 0) break;
      }
      if (i >= freshElements.length) break;

      // Click to open detail panel
      await freshElements[i]!.click();
      await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));

      // Extract all data from the opened detail panel
      const detailData = await page.evaluate(() => {
        const result: {
          name: string; rating: string; reviews: string;
          address: string; category: string; phone: string; website: string;
        } = { name: "", rating: "", reviews: "", address: "", category: "", phone: "", website: "" };

        const fullText = document.body?.innerText || "";

        // --- Business name ---
        // Google Maps puts the name in an h1 inside the detail panel
        const headings = document.querySelectorAll("h1");
        for (const h of headings) {
          const text = h.textContent?.trim() || "";
          if (text && text.length > 1 && text.length < 100 && !text.includes("Google")) {
            result.name = text;
            break;
          }
        }
        // Fallback to any visible heading if h1 fails
        if (!result.name) {
          const h2s = document.querySelectorAll("h2");
          for (const h of h2s) {
            const text = h.textContent?.trim() || "";
            if (text && text.length > 2 && text.length < 80 && !text.includes("Google")) {
              result.name = text;
              break;
            }
          }
        }

        // --- Rating & Reviews ---
        // Google Maps uses aria-label like "4.8 ★ 127 reviews"
        const ratingElements = document.querySelectorAll(
          '[aria-label*="star"], [aria-label*="stars"], [aria-label*="review"]'
        );
        for (const el of ratingElements) {
          const label = el.getAttribute("aria-label") || "";
          // Pattern: "4.5 stars" or "4.5 ★ 127 reviews" or "4.5 (127)"
          const starMatch = label.match(/([\d.]+)\s*(?:star|★)/i);
          if (starMatch && !result.rating) {
            result.rating = starMatch[1];
          }
          const reviewMatch = label.match(/([\d,]+)\s*reviews?/i);
          if (reviewMatch && !result.reviews) {
            result.reviews = reviewMatch[1].replace(/,/g, "");
          }
        }

        // Also search in full text for "4.5 (127 reviews)" pattern
        const ratingReviewMatch = fullText.match(/([\d.]+)\s*\(([\d,]+)\s*reviews?\)/i);
        if (ratingReviewMatch) {
          if (!result.rating) result.rating = ratingReviewMatch[1]!;
          if (!result.reviews) result.reviews = ratingReviewMatch[2]!.replace(/,/g, "");
        }
        // Try plain "4.5 ★" pattern in text
        if (!result.rating) {
          const starOnly = fullText.match(/([\d.]+)\s*★/);
          if (starOnly) result.rating = starOnly[1];
        }

        // --- Phone ---
        const telLinks = document.querySelectorAll('a[href^="tel:"]');
        for (const link of telLinks) {
          const tel = link.getAttribute("href") || "";
          result.phone = decodeURIComponent(tel.replace("tel:", ""));
          break;
        }
        if (!result.phone) {
          const phoneMatch = fullText.match(
            /(?:\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
          );
          if (phoneMatch) result.phone = phoneMatch[0];
        }

        // --- Website ---
        const allLinks = document.querySelectorAll('a[href^="http"]');
        for (const link of allLinks) {
          const href = link.getAttribute("href") || "";
          if (!href.includes("google.com") && !href.includes("maps.google") && !href.includes("support.google")) {
            result.website = href;
            break;
          }
        }

        // --- Address ---
        // Google Maps typically shows address as a clickable span or div
        const addressLink = document.querySelector('a[href*="maps.google.com/maps/place"]');
        if (addressLink) {
          // Try to find address text near the address button
          const parent = addressLink.closest("div");
          if (parent) {
            const dirText = parent.textContent || "";
            const addrMatch = dirText.match(
              /\d{1,5}\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Av|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Plaza|Square|Cir|Circle|Trail|Hwy|Highway)[^,]*,\s*[A-Z]{2}/i
            );
            if (addrMatch) result.address = addrMatch[0].trim();
          }
        }
        // Fallback: text-based address extraction
        if (!result.address) {
          const addressMatch = fullText.match(
            /\d{1,5}\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Av|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Plaza|Square|Cir|Circle|Trail|Hwy|Highway)\s*[,.]?\s*[A-Z]{2}\s*\d{5}/i
          );
          if (addressMatch) {
            result.address = addressMatch[0].trim();
          } else {
            // Simpler address: number + street + city,state
            const simpleAddr = fullText.match(
              /\d{1,5}\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Av|Road|Rd|Boulevard|Blvd)\s*[,.]?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2}/i
            );
            if (simpleAddr) result.address = simpleAddr[0].trim();
          }
        }

        // --- Category ---
        // Google Maps shows category as small text (often a link or span near the name)
        const categoryLinks = document.querySelectorAll('a[href*="/maps/search/"], button[class*="category"]');
        for (const link of categoryLinks) {
          const text = link.textContent?.trim() || "";
          if (text.length > 1 && text.length < 50 && !text.includes("Directions") && !text.includes("Save") && !text.includes("Share")) {
            result.category = text;
            break;
          }
        }

        return result;
      });

      allData.push(detailData);
    } catch {
      // Push minimal data if click fails
      allData.push({ name: "", rating: "", reviews: "", address: "", category: "", phone: "", website: "" });
    }
  }

  // Step 3: Fill in missing data from card-level extraction
  const cardData = await extractCardData(page);
  for (let i = 0; i < allData.length && i < cardData.length; i++) {
    if (!allData[i]!.name) allData[i]!.name = cardData[i]!.name;
    if (!allData[i]!.rating) allData[i]!.rating = cardData[i]!.rating;
    if (!allData[i]!.reviews) allData[i]!.reviews = cardData[i]!.reviews;
    if (!allData[i]!.address) allData[i]!.address = cardData[i]!.address;
    if (!allData[i]!.category) allData[i]!.category = cardData[i]!.category;
    if (!allData[i]!.phone) allData[i]!.phone = cardData[i]!.phone;
    if (!allData[i]!.website) allData[i]!.website = cardData[i]!.website;
  }

  return formatLeads(allData.slice(0, maxResults), searchQuery);
}

/**
 * Extract business data from Google Maps result cards (without clicking).
 * Uses stable attribute-based selectors to find names, ratings, etc.
 */
async function extractCardData(
  page: import("puppeteer-core").Page
): Promise<Array<{
  name: string;
  rating: string;
  reviews: string;
  address: string;
  category: string;
  phone: string;
  website: string;
}>> {
  return page.evaluate(() => {
    const results: Array<{
      name: string;
      rating: string;
      reviews: string;
      address: string;
      category: string;
      phone: string;
      website: string;
    }> = [];

    // Collect all potential result card elements
    const potentialCardSelectors = [
      ...Array.from(document.querySelectorAll('div[role="feed"] > div[jsaction]')),
      ...Array.from(document.querySelectorAll('div[role="feed"] > [role="article"]')),
      ...Array.from(document.querySelectorAll('a[href*="/maps/place"]')),
      ...Array.from(document.querySelectorAll('[data-result-index]')),
      ...Array.from(document.querySelectorAll('div[class*="Nv2PK"]')),
    ];

    // De-duplicate by parent/child containment
    const seen = new Set<Element>();
    const uniqueCards: Element[] = [];
    for (const card of potentialCardSelectors) {
      let isChild = false;
      for (const s of seen) {
        if (s.contains(card)) { isChild = true; break; }
      }
      if (!isChild) {
        seen.add(card);
        uniqueCards.push(card);
      }
    }

    for (const card of uniqueCards) {
      const text = card.textContent || "";
      const ariaLabel = card.getAttribute("aria-label") || "";

      // --- Name ---
      const nameEl = card.querySelector("h3, h2, [class*=\"font\"], [class*=\"headline\"]");
      const name = nameEl?.textContent?.trim()
        || ariaLabel.split("·")[0]?.trim()
        || text.split("\n").find((l) => l.trim().length > 2 && l.trim().length < 80)
        || text.split("·")[0]?.trim()
        || "";

      // --- Rating ---
      let rating = "";
      // aria-label like "4.8 stars" or "4.8 ★ ···"
      if (ariaLabel) {
        const starMatch = ariaLabel.match(/([\d.]+)\s*(?:star|★)/i);
        if (starMatch) rating = starMatch[1];
      }
      if (!rating) {
        const ratingEl = card.querySelector(
          '[aria-label*="stars"], [aria-label*="star"], [role="img"][aria-label]'
        );
        if (ratingEl) {
          const label = ratingEl.getAttribute("aria-label") || "";
          const match = label.match(/([\d.]+)/);
          if (match) rating = match[1];
        }
      }
      // Text fallback
      if (!rating) {
        const textMatch = text.match(/([\d.]+)\s*(?:★|stars?)/i);
        if (textMatch) rating = textMatch[1];
      }

      // --- Reviews ---
      let reviews = "";
      // From aria-label: "4.8 ★·· 127 reviews"
      if (ariaLabel) {
        const revMatch = ariaLabel.match(/([\d,]+)\s*reviews?/i);
        if (revMatch) reviews = revMatch[1].replace(/,/g, "");
      }
      if (!reviews) {
        const reviewEl = card.querySelector('[class*="review"], [class*="rating"]');
        if (reviewEl) {
          const rText = reviewEl.textContent?.trim() || "";
          const numMatch = rText.match(/[(（]?([\d,]+)[)）]?/);
          if (numMatch) reviews = numMatch[1]!.replace(/,/g, "");
        }
      }
      // Text fallback: "4.5 (127 reviews)" or "4.5 ★ (127)"
      if (!reviews) {
        const textRev = text.match(/\(([\d,]+)\s*reviews?\)/i);
        if (textRev) reviews = textRev[1].replace(/,/g, "");
      }

      // --- Address ---
      let address = "";
      const addressMatch = text.match(
        /\d{1,5}\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Av|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)/i
      );
      if (addressMatch) address = addressMatch[0];

      // --- Category ---
      let category = "";
      // Google Maps shows category as small text — look at the line after the name
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const nameIndex = lines.findIndex((l) => l === name);
      if (nameIndex >= 0 && nameIndex + 1 < lines.length) {
        const nextLine = lines[nameIndex + 1]!;
        if (nextLine.length > 1 && nextLine.length < 40 && !nextLine.includes("★") && !nextLine.includes("(") && !nextLine.match(/^\d/)) {
          category = nextLine;
        }
      }

      // --- Phone ---
      let phone = "";
      const telLink = card.querySelector('a[href^="tel:"]');
      if (telLink) {
        phone = decodeURIComponent(telLink.getAttribute("href")!.replace("tel:", ""));
      }
      if (!phone) {
        const phoneMatch = text.match(
          /(?:\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
        );
        if (phoneMatch) phone = phoneMatch[0];
      }

      // --- Website ---
      let website = "";
      const links = card.querySelectorAll("a");
      for (const link of links) {
        const href = link.getAttribute("href") || "";
        if (href.startsWith("http") && !href.includes("google.com/maps") && !href.includes("google.com/search")) {
          website = href;
          break;
        }
      }

      results.push({ name, rating, reviews, address, category, phone, website });
    }

    return results;
  });
}

/**
 * Fallback: Extract business data from aria-labels of result items.
 */
async function extractFromAriaLabels(
  page: import("puppeteer-core").Page
): Promise<Array<{
  name: string;
  rating: string;
  reviews: string;
  address: string;
  category: string;
  phone: string;
  website: string;
}>> {
  return page.evaluate(() => {
    const results: Array<{
      name: string;
      rating: string;
      reviews: string;
      address: string;
      category: string;
      phone: string;
      website: string;
    }> = [];

    const allElements = document.querySelectorAll("[aria-label]");
    for (const el of allElements) {
      const label = el.getAttribute("aria-label") || "";
      if (label.includes("★") || label.toLowerCase().includes("star")) {
        const parts = label.split("·").map((p) => p.trim());
        results.push({
          name: parts[0] || "",
          rating: label.match(/[\d.]+(?=\s*★)/)?.[0] || "",
          reviews: label.match(/[(（]([\d,]+)[)）]/)?.[1] || label.match(/([\d,]+)\s+reviews?/i)?.[1] || "",
          address: "",
          category: parts.length > 3 ? parts[2] || "" : "",
          phone: "",
          website: "",
        });
      }
    }

    return results;
  });
}

/**
 * Last resort: Extract any business-like names from visible text.
 */
async function extractFromAllText(
  page: import("puppeteer-core").Page
): Promise<Array<{
  name: string;
  rating: string;
  reviews: string;
  address: string;
  category: string;
  phone: string;
  website: string;
}>> {
  return page.evaluate(() => {
    const results: Array<{
      name: string;
      rating: string;
      reviews: string;
      address: string;
      category: string;
      phone: string;
      website: string;
    }> = [];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const el = node.parentElement;
          if (!el || el.offsetParent === null) return NodeFilter.FILTER_REJECT;
          const text = node.textContent?.trim() || "";
          if (text.length < 3 || text.length > 100) return NodeFilter.FILTER_REJECT;
          if (/^[\d\s\-—]+$/.test(text)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const seen = new Set<string>();
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent?.trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        if (/^[A-Z][a-z]+\s/.test(text) && !text.includes("Google") && !text.includes("Maps")) {
          results.push({
            name: text,
            rating: "",
            reviews: "",
            address: "",
            category: "",
            phone: "",
            website: "",
          });
        }
      }
      if (results.length >= 20) break;
    }

    return results;
  });
}

// enrichViaDetailPanel is now inlined into extractLeadsFromPage — kept for backward compat
async function enrichViaDetailPanel(
  page: import("puppeteer-core").Page,
  cardData: Array<{
    name: string; rating: string; reviews: string;
    address: string; category: string; phone: string; website: string;
  }>,
  maxResults: number
): Promise<Array<{
  name: string; rating: string; reviews: string;
  address: string; category: string; phone: string; website: string;
}>> {
  return cardData;
}

/**
 * Format raw scraped card data into standard ScrapedLead[] format.
 */
function formatLeads(
  rawData: Array<{
    name: string;
    rating: string;
    reviews: string;
    address: string;
    category: string;
    phone: string;
    website: string;
  }>,
  searchQuery: string
): ScrapedLead[] {
  return rawData
    .filter((d) => d.name && d.name.length > 2)
    .map((d) => ({
      name: d.name,
      company: d.name,
      role: d.category || "Business Owner",
      email: "",
      phone: d.phone || "",
      source: "google-maps" as const,
      sourceUrl: d.website || "",
      score: computeScore(d),
      personaType: inferPersona(d.name, d.category),
      notes: buildNotes(d, searchQuery),
      // ==== New enriched business detail fields ====
      rating: d.rating || "",
      reviews: d.reviews || "",
      address: d.address || "",
      businessDetails: buildBusinessDetails(d),
      category: d.category || "",
    }));
}

/**
 * Enrich leads by finding emails from their websites.
 * Runs in parallel with a concurrency limit to avoid overwhelming servers.
 */
async function enrichLeadsWithEmails(leads: ScrapedLead[]): Promise<ScrapedLead[]> {
  const CONCURRENCY = 3;
  const results: ScrapedLead[] = [];

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    const enriched = await Promise.all(
      batch.map(async (lead) => {
        if (!lead.sourceUrl) return lead;
        try {
          const email = await findEmailForBusiness(lead.sourceUrl, lead.name);
          if (email) {
            lead.email = email;
            lead.notes += ` Email: ${email}.`;
          }
        } catch {
          // Email enrichment failed silently
        }
        return lead;
      })
    );
    results.push(...enriched);
    await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}

/**
 * Compute a relevance score (0-100) based on available data.
 */
function computeScore(data: {
  name: string;
  rating: string;
  reviews: string;
  address: string;
  phone: string;
  website: string;
}): number {
  let score = 50;

  if (data.rating) {
    const rating = parseFloat(data.rating);
    if (!isNaN(rating)) score += rating * 5;
  }
  if (data.reviews) {
    const reviews = parseInt(data.reviews.replace(/,/g, ""), 10);
    if (!isNaN(reviews)) {
      if (reviews > 100) score += 15;
      else if (reviews > 50) score += 10;
      else score += 5;
    }
  }
  if (data.phone) score += 10;
  if (data.website) score += 10;
  if (data.address) score += 5;

  return Math.min(Math.round(score), 100);
}

/**
 * Infer persona type from business name and category.
 */
function inferPersona(name: string, category: string): string {
  const combined = `${name} ${category}`.toLowerCase();

  if (
    combined.includes("clinic") ||
    combined.includes("dr.") ||
    combined.includes("doctor") ||
    combined.includes("medical") ||
    combined.includes("chiropractor") ||
    combined.includes("therapist") ||
    combined.includes("naturopath") ||
    combined.includes("acupuncture") ||
    combined.includes("wellness center") ||
    combined.includes("health center")
  ) {
    return "practitioner";
  }

  if (
    combined.includes("gym") ||
    combined.includes("fitness") ||
    combined.includes("biohack") ||
    combined.includes("nutrition") ||
    combined.includes("yoga") ||
    combined.includes("spa") ||
    combined.includes("salon")
  ) {
    return "wellness-seeker";
  }

  if (
    combined.includes("studio") ||
    combined.includes("shop") ||
    combined.includes("store") ||
    combined.includes("boutique") ||
    combined.includes("market") ||
    combined.includes("supply")
  ) {
    return "business-builder";
  }

  return "practitioner";
}

/**
 * Build a rich business details string from scraped data.
 */
function buildBusinessDetails(
  data: {
    name: string;
    rating: string;
    reviews: string;
    address: string;
    category: string;
    phone: string;
    website: string;
  }
): string {
  const parts: string[] = [];

  if (data.rating) {
    parts.push(`${data.rating}★${data.reviews ? ` (${data.reviews} reviews)` : ""}`);
  }
  if (data.category) parts.push(`Category: ${data.category}`);
  if (data.address) parts.push(`Located at: ${data.address}`);
  if (data.phone) parts.push(`Phone: ${data.phone}`);
  if (data.website) parts.push(`Website: ${data.website}`);

  return parts.join(" | ");
}

/**
 * Build a useful notes string from the scraped data.
 */
function buildNotes(
  data: {
    name: string;
    rating: string;
    reviews: string;
    address: string;
    category: string;
    phone: string;
    website: string;
  },
  searchQuery: string
): string {
  const parts: string[] = [`Google Maps lead — "${searchQuery}".`];

  if (data.rating) {
    parts.push(`${data.rating}★${data.reviews ? ` (${data.reviews} reviews)` : ""}`);
  }
  if (data.category) parts.push(`Category: ${data.category}`);
  if (data.address) parts.push(`Located at: ${data.address}`);
  if (data.phone) parts.push(`Phone: ${data.phone}`);
  if (data.website) parts.push(`Web: ${data.website}`);

  return parts.join(" | ");
}
