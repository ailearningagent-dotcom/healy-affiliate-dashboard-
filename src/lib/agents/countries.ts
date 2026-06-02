/**
 * Countries Module — Global Market Database for Healy
 *
 * Comprehensive country information for all 60+ Healy markets.
 * Used for:
 *   - Country-aware lead enrichment and personalization
 *   - Timezone-aware follow-up scheduling
 *   - Region-specific channel preferences (WhatsApp-first for APAC, etc.)
 *   - Language-aware messaging
 *   - Global location batch generation for mass scraping
 */

export type Region = "apac" | "americas" | "europe" | "middle-east";

export interface CountryInfo {
  code: string;           // ISO 3166-1 alpha-2
  name: string;
  region: Region;
  timezones: string[];    // IANA timezone identifiers
  language: string;       // Primary language code
  channelPreference: "whatsapp" | "email" | "hybrid";  // Preferred outreach channel
  whatsappPenetration: "high" | "medium" | "low";       // WhatsApp usage level
  phoneCountryCode: string;  // e.g., "+91", "+1"
  businessDays: number[];    // 0=Sun, 1=Mon, ..., 6=Sat
  businessHours: { start: number; end: number }; // UTC hours for reasonable outreach
  note?: string;
}

// ========================================================================
// ALL 60+ HEALY COUNTRIES ORGANIZED BY REGION
// ========================================================================

export const HEALY_COUNTRIES: CountryInfo[] = [
  // ==================== ASIA PACIFIC ====================
  {
    code: "AU", name: "Australia", region: "apac",
    timezones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth"],
    language: "en", channelPreference: "hybrid", whatsappPenetration: "medium",
    phoneCountryCode: "+61", businessDays: [1,2,3,4,5], businessHours: { start: 0, end: 12 },
    note: "Strong email culture, WhatsApp growing",
  },
  {
    code: "KH", name: "Cambodia", region: "apac",
    timezones: ["Asia/Phnom_Penh"], language: "km", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+855", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
  },
  {
    code: "HK", name: "Hong Kong", region: "apac",
    timezones: ["Asia/Hong_Kong"], language: "zh", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+852", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
    note: "WhatsApp is primary messaging app",
  },
  {
    code: "IN", name: "India", region: "apac",
    timezones: ["Asia/Kolkata"], language: "hi", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+91", businessDays: [1,2,3,4,5,6], businessHours: { start: 2, end: 14 },
    note: "WhatsApp is dominant — 400M+ users. Always WhatsApp-first for India.",
  },
  {
    code: "ID", name: "Indonesia", region: "apac",
    timezones: ["Asia/Jakarta"], language: "id", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+62", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
    note: "WhatsApp is essential for business communication",
  },
  {
    code: "JP", name: "Japan", region: "apac",
    timezones: ["Asia/Tokyo"], language: "ja", channelPreference: "email", whatsappPenetration: "low",
    phoneCountryCode: "+81", businessDays: [1,2,3,4,5], businessHours: { start: 1, end: 11 },
    note: "Line dominates, but email is standard for business",
  },
  {
    code: "KR", name: "Korea", region: "apac",
    timezones: ["Asia/Seoul"], language: "ko", channelPreference: "email", whatsappPenetration: "low",
    phoneCountryCode: "+82", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 11 },
    note: "KakaoTalk dominates. Email for formal outreach.",
  },
  {
    code: "MY", name: "Malaysia", region: "apac",
    timezones: ["Asia/Kuala_Lumpur"], language: "ms", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+60", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
    note: "WhatsApp is universal for personal and business",
  },
  {
    code: "NZ", name: "New Zealand", region: "apac",
    timezones: ["Pacific/Auckland"], language: "en", channelPreference: "hybrid", whatsappPenetration: "medium",
    phoneCountryCode: "+64", businessDays: [1,2,3,4,5], businessHours: { start: 20, end: 8 },
  },
  {
    code: "PH", name: "Philippines", region: "apac",
    timezones: ["Asia/Manila"], language: "tl", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+63", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
    note: "WhatsApp is the primary messaging platform",
  },
  {
    code: "SG", name: "Singapore", region: "apac",
    timezones: ["Asia/Singapore"], language: "en", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+65", businessDays: [1,2,3,4,5], businessHours: { start: 1, end: 13 },
  },
  {
    code: "TW", name: "Taiwan", region: "apac",
    timezones: ["Asia/Taipei"], language: "zh", channelPreference: "hybrid", whatsappPenetration: "medium",
    phoneCountryCode: "+886", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
    note: "Line is dominant, but WhatsApp has growing user base",
  },
  {
    code: "TH", name: "Thailand", region: "apac",
    timezones: ["Asia/Bangkok"], language: "th", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+66", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
  },
  {
    code: "VN", name: "Vietnam", region: "apac",
    timezones: ["Asia/Ho_Chi_Minh"], language: "vi", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+84", businessDays: [1,2,3,4,5,6], businessHours: { start: 1, end: 13 },
  },

  // ==================== AMERICAS ====================
  {
    code: "CA", name: "Canada", region: "americas",
    timezones: ["America/Toronto", "America/Vancouver", "America/Edmonton"],
    language: "en", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+1", businessDays: [1,2,3,4,5], businessHours: { start: 13, end: 23 },
  },
  {
    code: "CL", name: "Chile", region: "americas",
    timezones: ["America/Santiago"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+56", businessDays: [1,2,3,4,5], businessHours: { start: 12, end: 22 },
    note: "WhatsApp is very popular for business communication",
  },
  {
    code: "CO", name: "Colombia", region: "americas",
    timezones: ["America/Bogota"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+57", businessDays: [1,2,3,4,5,6], businessHours: { start: 11, end: 23 },
    note: "WhatsApp is the backbone of business communication",
  },
  {
    code: "CR", name: "Costa Rica", region: "americas",
    timezones: ["America/Costa_Rica"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+506", businessDays: [1,2,3,4,5], businessHours: { start: 12, end: 22 },
  },
  {
    code: "DO", name: "Dominican Republic", region: "americas",
    timezones: ["America/Santo_Domingo"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+1", businessDays: [1,2,3,4,5,6], businessHours: { start: 12, end: 22 },
  },
  {
    code: "EC", name: "Ecuador", region: "americas",
    timezones: ["America/Guayaquil"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+593", businessDays: [1,2,3,4,5], businessHours: { start: 11, end: 23 },
  },
  {
    code: "GT", name: "Guatemala", region: "americas",
    timezones: ["America/Guatemala"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+502", businessDays: [1,2,3,4,5,6], businessHours: { start: 12, end: 22 },
  },
  {
    code: "MX", name: "Mexico", region: "americas",
    timezones: ["America/Mexico_City"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+52", businessDays: [1,2,3,4,5,6], businessHours: { start: 11, end: 23 },
    note: "WhatsApp is the #1 messaging app for business",
  },
  {
    code: "PA", name: "Panama", region: "americas",
    timezones: ["America/Panama"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+507", businessDays: [1,2,3,4,5,6], businessHours: { start: 12, end: 22 },
  },
  {
    code: "PE", name: "Peru", region: "americas",
    timezones: ["America/Lima"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+51", businessDays: [1,2,3,4,5,6], businessHours: { start: 11, end: 23 },
  },
  {
    code: "US", name: "United States", region: "americas",
    timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
    language: "en", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+1", businessDays: [1,2,3,4,5], businessHours: { start: 13, end: 23 },
    note: "Email is standard for business. WhatsApp growing in Spanish-speaking communities.",
  },

  // ==================== EUROPE ====================
  {
    code: "AT", name: "Austria", region: "europe",
    timezones: ["Europe/Vienna"], language: "de", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+43", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
    note: "WhatsApp popular for personal, email for business",
  },
  {
    code: "BE", name: "Belgium", region: "europe",
    timezones: ["Europe/Brussels"], language: "nl", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+32", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "BG", name: "Bulgaria", region: "europe",
    timezones: ["Europe/Sofia"], language: "bg", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+359", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
    note: "Viber also popular, WhatsApp growing rapidly",
  },
  {
    code: "HR", name: "Croatia", region: "europe",
    timezones: ["Europe/Zagreb"], language: "hr", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+385", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "CY", name: "Cyprus", region: "europe",
    timezones: ["Asia/Nicosia"], language: "el", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+357", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
  },
  {
    code: "CZ", name: "Czech Republic", region: "europe",
    timezones: ["Europe/Prague"], language: "cs", channelPreference: "hybrid", whatsappPenetration: "medium",
    phoneCountryCode: "+420", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "DK", name: "Denmark", region: "europe",
    timezones: ["Europe/Copenhagen"], language: "da", channelPreference: "email", whatsappPenetration: "low",
    phoneCountryCode: "+45", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 16 },
  },
  {
    code: "EE", name: "Estonia", region: "europe",
    timezones: ["Europe/Tallinn"], language: "et", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+372", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
  },
  {
    code: "FI", name: "Finland", region: "europe",
    timezones: ["Europe/Helsinki"], language: "fi", channelPreference: "email", whatsappPenetration: "low",
    phoneCountryCode: "+358", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
  },
  {
    code: "FR", name: "France", region: "europe",
    timezones: ["Europe/Paris"], language: "fr", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+33", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
    note: "WhatsApp very popular, but email is standard for formal business",
  },
  {
    code: "DE", name: "Germany", region: "europe",
    timezones: ["Europe/Berlin"], language: "de", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+49", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 15 },
    note: "GDPR-sensitive market. Email preferred for official outreach.",
  },
  {
    code: "GI", name: "Gibraltar", region: "europe",
    timezones: ["Europe/Gibraltar"], language: "en", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+350", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "GR", name: "Greece", region: "europe",
    timezones: ["Europe/Athens"], language: "el", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+30", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
  },
  {
    code: "GG", name: "Guernsey", region: "europe",
    timezones: ["Europe/Guernsey"], language: "en", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+44", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "HU", name: "Hungary", region: "europe",
    timezones: ["Europe/Budapest"], language: "hu", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+36", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "IE", name: "Ireland", region: "europe",
    timezones: ["Europe/Dublin"], language: "en", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+353", businessDays: [1,2,3,4,5], businessHours: { start: 8, end: 18 },
  },
  {
    code: "IT", name: "Italy", region: "europe",
    timezones: ["Europe/Rome"], language: "it", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+39", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
    note: "WhatsApp is the leading messaging platform",
  },
  {
    code: "JE", name: "Jersey", region: "europe",
    timezones: ["Europe/Jersey"], language: "en", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+44", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "LV", name: "Latvia", region: "europe",
    timezones: ["Europe/Riga"], language: "lv", channelPreference: "hybrid", whatsappPenetration: "medium",
    phoneCountryCode: "+371", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
  },
  {
    code: "LI", name: "Liechtenstein", region: "europe",
    timezones: ["Europe/Vaduz"], language: "de", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+423", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "LT", name: "Lithuania", region: "europe",
    timezones: ["Europe/Vilnius"], language: "lt", channelPreference: "hybrid", whatsappPenetration: "medium",
    phoneCountryCode: "+370", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
  },
  {
    code: "LU", name: "Luxembourg", region: "europe",
    timezones: ["Europe/Luxembourg"], language: "lb", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+352", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "MT", name: "Malta", region: "europe",
    timezones: ["Europe/Malta"], language: "mt", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+356", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "NL", name: "Netherlands", region: "europe",
    timezones: ["Europe/Amsterdam"], language: "nl", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+31", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "NO", name: "Norway", region: "europe",
    timezones: ["Europe/Oslo"], language: "no", channelPreference: "email", whatsappPenetration: "low",
    phoneCountryCode: "+47", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 16 },
  },
  {
    code: "PL", name: "Poland", region: "europe",
    timezones: ["Europe/Warsaw"], language: "pl", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+48", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
    note: "WhatsApp is the #1 messaging app",
  },
  {
    code: "PT", name: "Portugal", region: "europe",
    timezones: ["Europe/Lisbon"], language: "pt", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+351", businessDays: [1,2,3,4,5], businessHours: { start: 8, end: 18 },
  },
  {
    code: "RO", name: "Romania", region: "europe",
    timezones: ["Europe/Bucharest"], language: "ro", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+40", businessDays: [1,2,3,4,5], businessHours: { start: 6, end: 16 },
  },
  {
    code: "SK", name: "Slovakia", region: "europe",
    timezones: ["Europe/Bratislava"], language: "sk", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+421", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "SI", name: "Slovenia", region: "europe",
    timezones: ["Europe/Ljubljana"], language: "sl", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+386", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "ES", name: "Spain", region: "europe",
    timezones: ["Europe/Madrid"], language: "es", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+34", businessDays: [1,2,3,4,5], businessHours: { start: 8, end: 18 },
    note: "WhatsApp is the dominant messaging platform",
  },
  {
    code: "SE", name: "Sweden", region: "europe",
    timezones: ["Europe/Stockholm"], language: "sv", channelPreference: "email", whatsappPenetration: "low",
    phoneCountryCode: "+46", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 16 },
  },
  {
    code: "CH", name: "Switzerland", region: "europe",
    timezones: ["Europe/Zurich"], language: "de", channelPreference: "hybrid", whatsappPenetration: "high",
    phoneCountryCode: "+41", businessDays: [1,2,3,4,5], businessHours: { start: 7, end: 17 },
  },
  {
    code: "GB", name: "United Kingdom", region: "europe",
    timezones: ["Europe/London"], language: "en", channelPreference: "email", whatsappPenetration: "medium",
    phoneCountryCode: "+44", businessDays: [1,2,3,4,5], businessHours: { start: 8, end: 18 },
    note: "Email preferred for business, WhatsApp common socially",
  },
  {
    code: "UA", name: "Ukraine", region: "europe",
    timezones: ["Europe/Kiev"], language: "uk", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+380", businessDays: [1,2,3,4,5,6], businessHours: { start: 6, end: 16 },
    note: "WhatsApp and Telegram are widely used",
  },

  // ==================== MIDDLE EAST & OTHERS ====================
  {
    code: "AE", name: "United Arab Emirates", region: "middle-east",
    timezones: ["Asia/Dubai"], language: "ar", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+971", businessDays: [1,2,3,4,5,6], businessHours: { start: 4, end: 14 },
    note: "WhatsApp is the primary business communication tool",
  },
  {
    code: "TR", name: "Turkey", region: "middle-east",
    timezones: ["Europe/Istanbul"], language: "tr", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+90", businessDays: [1,2,3,4,5,6], businessHours: { start: 6, end: 16 },
  },
  // Caribbean territories
  {
    code: "AW", name: "Aruba", region: "americas",
    timezones: ["America/Aruba"], language: "nl", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+297", businessDays: [1,2,3,4,5], businessHours: { start: 12, end: 22 },
  },
  {
    code: "CW", name: "Curacao", region: "americas",
    timezones: ["America/Curacao"], language: "nl", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+599", businessDays: [1,2,3,4,5], businessHours: { start: 12, end: 22 },
  },
  {
    code: "BQ", name: "Bonaire", region: "americas",
    timezones: ["America/Kralendijk"], language: "nl", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+599", businessDays: [1,2,3,4,5], businessHours: { start: 12, end: 22 },
  },
  {
    code: "RE", name: "Reunion", region: "europe",
    timezones: ["Indian/Reunion"], language: "fr", channelPreference: "whatsapp", whatsappPenetration: "high",
    phoneCountryCode: "+262", businessDays: [1,2,3,4,5,6], businessHours: { start: 2, end: 14 },
  },
];

// ========================================================================
// LOOKUP HELPERS
// ========================================================================

const countryByCode = new Map<string, CountryInfo>();
const countryByPhonePrefix = new Map<string, CountryInfo>();

for (const c of HEALY_COUNTRIES) {
  countryByCode.set(c.code.toUpperCase(), c);
  countryByCode.set(c.code.toLowerCase(), c);
  // Map phone prefixes — take the longest match for problematic overlaps
  const prefix = c.phoneCountryCode.replace(/\D/g, "");
  countryByPhonePrefix.set(prefix, c);
}

/**
 * Get country info by ISO code (e.g., "IN", "US", "DE").
 */
export function getCountryByCode(code: string): CountryInfo | undefined {
  return countryByCode.get(code.toUpperCase());
}

/**
 * Detect country from a phone number.
 * Extracts the country code prefix and matches against known phone codes.
 */
export function detectCountryFromPhone(phone: string): CountryInfo | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  // Try longest prefix first (e.g., "+1" for US/CA, "+506" for Costa Rica)
  for (let len = 5; len >= 1; len--) {
    const prefix = digits.slice(0, len);
    const country = countryByPhonePrefix.get(prefix);
    if (country) return country;
  }
  return undefined;
}

/**
 * Detect country from email domain TLD.
 * e.g., ".in" → India, ".de" → Germany
 */
export function detectCountryFromEmail(email: string): CountryInfo | undefined {
  if (!email) return undefined;
  const match = email.match(/\.([a-z]{2})$/);
  if (!match) return undefined;
  const tld = match[1]!.toUpperCase();
  // Map common TLDs to country codes
  const tldMap: Record<string, string> = {
    "AU": "AU", "AT": "AT", "BE": "BE", "CA": "CA", "CH": "CH",
    "DE": "DE", "DK": "DK", "ES": "ES", "FI": "FI", "FR": "FR",
    "GB": "GB", "HK": "HK", "IE": "IE", "IN": "IN", "IT": "IT",
    "JP": "JP", "KR": "KR", "MX": "MX", "MY": "MY", "NL": "NL",
    "NO": "NO", "NZ": "NZ", "PH": "PH", "PL": "PL", "PT": "PT",
    "SE": "SE", "SG": "SG", "TH": "TH", "TW": "TW", "UK": "GB",
    "US": "US", "VN": "VN", "ZA": "ZA",
  };
  const code = tldMap[tld];
  if (code) return getCountryByCode(code);
  return undefined;
}

/**
 * Detect country from a combination of phone, email, and location hints.
 */
export function detectCountry(lead: { phone?: string; email?: string; location?: string }): CountryInfo | undefined {
  // 1. Try phone first (most reliable)
  if (lead.phone) {
    const fromPhone = detectCountryFromPhone(lead.phone);
    if (fromPhone) return fromPhone;
  }
  // 2. Try email TLD
  if (lead.email) {
    const fromEmail = detectCountryFromEmail(lead.email);
    if (fromEmail) return fromEmail;
  }
  // 3. Try location string
  if (lead.location) {
    const loc = lead.location.toLowerCase();
    for (const c of HEALY_COUNTRIES) {
      if (loc.includes(c.name.toLowerCase()) || loc.includes(c.code.toLowerCase())) {
        return c;
      }
    }
  }
  return undefined;
}

// ========================================================================
// REGION BATCHES FOR MASS SCRAPING
// ========================================================================

/**
 * Get all country names for a specific region.
 */
export function getCountriesByRegion(region: Region): CountryInfo[] {
  return HEALY_COUNTRIES.filter((c) => c.region === region);
}

/**
 * Generate location-based scrape queries for a list of countries.
 */
export function generateGlobalScrapeQueries(
  baseQueries: string[],
  countries: CountryInfo[]
): { query: string; location: string; country: CountryInfo }[] {
  const results: { query: string; location: string; country: CountryInfo }[] = [];
  for (const country of countries) {
    for (const query of baseQueries) {
      results.push({ query, location: country.name, country });
    }
  }
  return results;
}

// ========================================================================
// BUSINESS HOURS / TIMEZONE HELPERS
// ========================================================================

/**
 * Get the current UTC hour offset for a country's timezone.
 */
export function getCountryUtcOffset(country: CountryInfo): number {
  try {
    // Use the first timezone as representative
    const tz = country.timezones[0];
    if (!tz) return 0;
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
      timeZoneName: "short",
    });
    // Parse the UTC offset from the formatted string
    const parts = formatter.formatToParts(now);
    return 0; // Simplified — real offset calculation would use IANA db
  } catch {
    return 0;
  }
}

/**
 * Check if it's a reasonable time to send a message to a given country.
 * Returns true if within country business hours (UTC).
 */
export function isWithinBusinessHours(country: CountryInfo, utcHour: number = new Date().getUTCHours()): boolean {
  const { start, end } = country.businessHours;
  if (start <= end) {
    return utcHour >= start && utcHour < end;
  }
  // Handles overnight ranges (e.g., NZ: start=20, end=8)
  return utcHour >= start || utcHour < end;
}

/**
 * Get the recommended channel order for a country.
 * APAC + Latin America = WhatsApp first, Europe + North America = email first.
 */
export function getChannelOrderForCountry(country?: CountryInfo): ("whatsapp" | "email" | "phone_call")[] {
  if (!country) return ["whatsapp", "email"]; // Default: WhatsApp-first

  switch (country.channelPreference) {
    case "whatsapp":
      return ["whatsapp", "email", "phone_call"];
    case "email":
      return ["email", "whatsapp", "phone_call"];
    case "hybrid":
      return ["whatsapp", "email", "phone_call"];
    default:
      return ["whatsapp", "email"];
  }
}

/**
 * Get a human-readable region label.
 */
export function getRegionLabel(region: Region): string {
  const labels: Record<Region, string> = {
    "apac": "Asia Pacific",
    "americas": "Americas",
    "europe": "Europe",
    "middle-east": "Middle East",
  };
  return labels[region] || region;
}
