import { logger } from "@/lib/logger";
import type { ScrapedLead } from "./types";

const CHROME_PATH =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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
 * Improvements over v1:
 * - Stealth mode to avoid headless detection
 * - More robust selector strategies (tries multiple approaches)
 * - Better error reporting with specific failure reasons
 * - Returns partial results even if some extraction fails
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
      executablePath: CHROME_PATH,
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
    logger.info("GoogleMapsScraper", `Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for results to render — Google Maps loads dynamically
    // Try several possible result container selectors
    const selectors = [
      '[role="feed"]',
      'div[role="main"]',
      'div[aria-label*="Results"]',
      'div[class*="m6QErb"]',
      'div[class*="Nv2PK"]',
    ];

    let foundResults = false;
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
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

    // Wait a bit more for lazy-loaded content
    await page.evaluate(() => new Promise((r) => setTimeout(r, 3000)));

    // Scroll the results panel to load more listings
    await scrollResultsPanel(page, maxResults);

    // Wait for results to populate after scrolling
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));

    // Extract business data from the results using multiple strategies
    const leads = await extractLeadsFromPage(page, maxResults, searchQuery);

    logger.info("GoogleMapsScraper", `Extracted ${leads.length} leads from Google Maps`);
    return leads;
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
        // Strategy 1: Scrollable panel with role="feed"
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
        const scrollable = Array.from(document.querySelectorAll('div')).find(
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

/**
 * Extract business leads from the current Google Maps page using multiple strategies.
 */
async function extractLeadsFromPage(
  page: import("puppeteer-core").Page,
  maxResults: number,
  searchQuery: string
): Promise<ScrapedLead[]> {
  // Strategy 1: Try extracting from result cards
  let cardData = await extractCardData(page);

  if (cardData.length > 0) {
    // Try to enrich by clicking on cards to open detail panel
    if (cardData.length < maxResults) {
      const enriched = await enrichViaDetailPanel(page, cardData, maxResults);
      return formatLeads(enriched.slice(0, maxResults), searchQuery);
    }
    return formatLeads(cardData.slice(0, maxResults), searchQuery);
  }

  // Strategy 2: Try extracting from aria-labels of all clickable result items
  logger.warn("GoogleMapsScraper", "Card extraction returned 0 results, trying aria-label extraction");
  cardData = await extractFromAriaLabels(page);

  if (cardData.length > 0) {
    return formatLeads(cardData.slice(0, maxResults), searchQuery);
  }

  // Strategy 3: Last resort — extract any visible text that looks like business names
  logger.warn("GoogleMapsScraper", "Aria extraction also returned 0, trying raw text extraction");
  cardData = await extractFromAllText(page);

  return formatLeads(cardData.slice(0, maxResults), searchQuery);
}

/**
 * Extract business data from Google Maps result cards.
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

    // Try to find all business listing elements
    // Google Maps typically wraps each result in a container
    const potentialCards = [
      // Strategy A: role="article" inside role="feed"
      ...Array.from(document.querySelectorAll('[role="feed"] > [role="article"]')),
      // Strategy B: Direct listing containers with common classes
      ...Array.from(document.querySelectorAll('a[href*="/maps/place"]')),
      // Strategy C: Generic container that Google uses
      ...Array.from(document.querySelectorAll('div[class*="Nv2PK"]')),
      // Strategy D: Container with specific data attributes
      ...Array.from(document.querySelectorAll('[data-result-index]')),
    ];

    // De-duplicate by checking if parent/child overlaps
    const seen = new Set<Element>();
    const uniqueCards: Element[] = [];
    for (const card of potentialCards) {
      // Skip if any ancestor is already in our set
      let isChild = false;
      for (const s of seen) {
        if (s.contains(card)) {
          isChild = true;
          break;
        }
      }
      if (!isChild) {
        seen.add(card);
        uniqueCards.push(card);
      }
    }

    for (const card of uniqueCards) {
      const text = card.textContent || "";
      const html = card.innerHTML || "";

      // Find name — usually in a heading or font-weight element
      const nameEl =
        card.querySelector('h3, h2, [class*="font"], [class*="headline"], [class*="title"]');
      const name = nameEl?.textContent?.trim() ||
        card.getAttribute("aria-label")?.split(",")?.[0]?.trim() ||
        text.split("\n").find((l) => l.trim().length > 2 && l.trim().length < 80) ||
        text.split("·")[0]?.trim() ||
        "";

      // Rating
      const ratingEl = card.querySelector('[aria-label*="stars"], [class*="star"], [role="img"][aria-label]');
      let rating = ratingEl?.getAttribute("aria-label")?.match(/[\d.]+/)?.[0] ||
        ratingEl?.textContent?.trim() ||
        "";

      // Reviews count
      let reviews = "";
      const reviewEl = card.querySelector('[class*="review"], [class*="rating"]');
      if (reviewEl) {
        const rText = reviewEl.textContent?.trim() || "";
        const numMatch = rText.match(/[(（]?([\d,]+)[)）]?/);
        if (numMatch) reviews = numMatch[1];
      }

      // Address
      let address = "";
      const addressMatch = text.match(
        /\d{1,5}\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Av|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)/i
      );
      if (addressMatch) address = addressMatch[0];

      // Category / type of business
      let category = "";
      // Sometimes appears as a small text above or beside the name
      const smallTexts = Array.from(card.querySelectorAll("span, div"))
        .map((e) => e.textContent?.trim())
        .filter((t): t is string => !!t && t.length > 0 && t.length < 40);
      for (const t of smallTexts) {
        if (
          !name.includes(t) &&
          !t.includes("(") &&
          !t.includes("Star")
        ) {
          category = t;
          break;
        }
      }

      // Phone and website from links
      let phone = "";
      let website = "";
      const links = card.querySelectorAll("a");
      for (const link of links) {
        const href = link.getAttribute("href") || "";
        if (href.startsWith("tel:")) {
          phone = decodeURIComponent(href.replace("tel:", ""));
        } else if (href.startsWith("http") && !href.includes("google.com/maps")) {
          website = href;
        }
      }

      // Also try to find phone in text
      if (!phone) {
        const phoneMatch = text.match(
          /(?:\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
        );
        if (phoneMatch) phone = phoneMatch[0];
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

    // Find all elements with aria-label that looks like a business result
    const allElements = document.querySelectorAll("[aria-label]");
    for (const el of allElements) {
      const label = el.getAttribute("aria-label") || "";
      // Google Maps uses patterns like "Business Name · 4.5 ★·· (123) · $"
      if (label.includes("★") || label.includes("star")) {
        const parts = label.split("·").map((p) => p.trim());
        results.push({
          name: parts[0] || "",
          rating: label.match(/[\d.]+(?=\s*★)/)?.[0] || "",
          reviews: label.match(/[(（]([\d,]+)[)）]/)?.[1] || "",
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

    // Get all visible text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const el = node.parentElement;
          if (!el || el.offsetParent === null) return NodeFilter.FILTER_REJECT;
          const text = node.textContent?.trim() || "";
          if (text.length < 3 || text.length > 100) return NodeFilter.FILTER_REJECT;
          // Skip numbers, single words that look like labels
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
        // Filter for strings that look like business names (title case, 2+ words)
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

/**
 * Click on result cards to open the detail/info panel and extract richer data
 * (phone, website, hours, etc.).
 */
async function enrichViaDetailPanel(
  page: import("puppeteer-core").Page,
  cardData: Array<{
    name: string;
    rating: string;
    reviews: string;
    address: string;
    category: string;
    phone: string;
    website: string;
  }>,
  maxResults: number
): Promise<Array<{
  name: string;
  rating: string;
  reviews: string;
  address: string;
  category: string;
  phone: string;
  website: string;
}>> {
  // Find clickable card elements
  const clickSelectors = [
    'a[href*="/maps/place"]',
    '[role="article"]',
    'div[class*="Nv2PK"]',
  ];

  let clickableElements: import("puppeteer-core").ElementHandle[] = [];
  for (const sel of clickSelectors) {
    const els = await page.$$(sel);
    if (els.length > 0) {
      clickableElements = els;
      break;
    }
  }

  const limit = Math.min(clickableElements.length, maxResults);
  for (let i = 0; i < limit; i++) {
    try {
      await clickableElements[i]!.click();
      await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

      // Extract detail panel data
      const detailData = await page.evaluate(() => {
        const panelSelectors = [
          'div[class*="m6QErb"]:not([role="feed"])',
          'div[role="main"] [role="region"]',
          'div[class*="section-hero-header"]',
          'div[class*="TIHn2"]',
          'div[class*="lbUlmc"]',
        ];

        let panel: Element | null = null;
        for (const sel of panelSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.length > 20) {
            panel = el;
            break;
          }
        }
        if (!panel) return null;

        const text = panel.textContent || "";
        const links = panel.querySelectorAll("a");
        let phone = "";
        let website = "";

        for (const link of links) {
          const href = link.getAttribute("href") || "";
          if (href.startsWith("tel:")) {
            phone = decodeURIComponent(href.replace("tel:", ""));
          } else if (href.startsWith("http") && !href.includes("google.com")) {
            website = href;
          }
        }

        // Try to find phone in text
        const phoneMatch = text.match(
          /(?:\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
        );
        if (!phone && phoneMatch) {
          phone = phoneMatch[0];
        }

        return { phone, website };
      });

      if (detailData) {
        if (detailData.phone) cardData[i]!.phone = detailData.phone;
        if (detailData.website) cardData[i]!.website = detailData.website;
      }
    } catch {
      continue;
    }
  }

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
    }));
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
  if (data.reviews) score += 5;
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
  const parts: string[] = [`Found on Google Maps via search "${searchQuery}".`];

  if (data.rating) {
    parts.push(`Rating: ${data.rating}${data.reviews ? ` (${data.reviews} reviews)` : ""}.`);
  }
  if (data.address) parts.push(`Location: ${data.address}.`);
  if (data.category) parts.push(`Category: ${data.category}.`);
  if (data.website) parts.push(`Website: ${data.website}.`);

  return parts.join(" ");
}
