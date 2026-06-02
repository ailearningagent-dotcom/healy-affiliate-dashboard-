import { logger } from "@/lib/logger";

export interface EmailScrapeResult {
  email: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export async function scrapeEmailsFromWebsite(website: string): Promise<EmailScrapeResult[]> {
  if (!website) return [];
  const results: EmailScrapeResult[] = [];
  const base = website.replace(/\/+$/, "");
  const urlsToCheck = [base, base + "/contact", base + "/about", base + "/about-us", base + "/team"];

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const genericPatterns = ["noreply", "no-reply", "no_reply", "admin", "webmaster", "hostmaster", "support", "info", "hello", "contact"];

  for (const url of urlsToCheck) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      clearTimeout(timeout);
      if (!response.ok) continue;

      const html = await response.text();
      const matches = html.match(emailRegex);
      if (matches) {
        for (const email of matches) {
          const local = email.split("@")[0].toLowerCase();
          const isGeneric = genericPatterns.some((p) => local.includes(p));
          const isUnique = results.every((r) => r.email !== email);
          if (isUnique && !isGeneric) {
            results.push({ email, source: url, confidence: "medium" });
          }
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      continue;
    }
  }

  if (results.length > 0) results[0].confidence = "high";
  return results;
}

export async function findEmailForBusiness(website: string, businessName?: string): Promise<string | null> {
  if (!website) return null;
  const emails = await scrapeEmailsFromWebsite(website);
  if (emails.length === 0) return null;

  let domain = "";
  try {
    domain = new URL(website.startsWith("http") ? website : "https://" + website).hostname;
  } catch { return emails[0].email; }

  const domainMatch = emails.find((e) => e.email.endsWith("@" + domain));
  if (domainMatch) return domainMatch.email;

  if (!businessName) return emails[0].email;
  const businessParts = businessName.toLowerCase().split(" ").filter((p) => p.length > 3);
  const bizMatch = emails.find((e) => {
    const local = e.email.split("@")[0].toLowerCase();
    return businessParts.some((part) => local.includes(part));
  });
  if (bizMatch) return bizMatch.email;

  return emails[0].email;
}
