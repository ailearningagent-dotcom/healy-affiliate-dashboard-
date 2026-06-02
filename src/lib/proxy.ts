/**
 * Proxy configuration for external API calls.
 * Currently a placeholder — configure as needed for your deployment.
 */

export const PROXY_CONFIG = {
  enabled: false,
  url: process.env.PROXY_URL || "",
} as const;
