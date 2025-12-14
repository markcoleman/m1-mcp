import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Sanitizes HTTP header values to prevent header injection attacks.
 * Removes newline characters and trims whitespace.
 * @param value - Raw header value
 * @returns Sanitized header value
 */
export function sanitizeHeaderValue(value: string): string {
  // Prevent invalid header characters; avoid header injection.
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Builds a properly formatted Cookie header for Members1st requests.
 * Handles three formats:
 * 1. Full cookie header already containing M1Online (returned as-is)
 * 2. Just the cookie value (wrapped with M1Online=)
 * 3. Complete cookie string with multiple cookies (returned as-is)
 * @param raw - Raw cookie value or header from environment
 * @returns Properly formatted Cookie header value
 */
export function buildCookieHeader(raw: string): string {
  const sanitized = sanitizeHeaderValue(raw);
  // If caller already provided a full Cookie header value that includes M1Online, keep it.
  if (/(^|;\s*)m1online=/i.test(sanitized)) return sanitized;

  // If they provided just the cookie value (common when copy/pasting from storage),
  // wrap it with the expected cookie name.
  if (!sanitized.includes("=")) return `M1Online=${sanitized}`;

  // Otherwise, assume they provided a complete cookie string (maybe multiple cookies).
  return sanitized;
}

/**
 * Reads cookie value from a file.
 * @param filePath - Path to file containing cookie value
 * @returns Cookie value from file, or undefined if file cannot be read
 */
export function readCookieFromFile(filePath: string): string | undefined {
  try {
    const absolutePath = resolve(filePath);
    const content = readFileSync(absolutePath, "utf-8");
    return content.trim();
  } catch {
    // Silent failure is intentional - file not existing is expected when env var isn't set
    // or user hasn't created the file yet. Caller will handle undefined gracefully.
    return undefined;
  }
}

/**
 * Gets the cookie value from environment variable or file.
 * Checks MEMBERS1ST_COOKIE first, then falls back to MEMBERS1ST_COOKIE_FILE.
 * @returns Cookie value or undefined if not found
 */
export function getCookieValue(): string | undefined {
  // First, check direct env var
  const directCookie = process.env.MEMBERS1ST_COOKIE;
  if (directCookie) return directCookie;

  // Fall back to file path
  const cookieFilePath = process.env.MEMBERS1ST_COOKIE_FILE;
  if (cookieFilePath) return readCookieFromFile(cookieFilePath);

  return undefined;
}

/**
 * Parses additional headers from MEMBERS1ST_HEADERS_JSON environment variable.
 * Expected format: JSON object with string keys and values.
 * @returns Object containing parsed headers, or empty object if invalid/missing
 */
export function parseAdditionalHeaders(): Record<string, string> {
  const raw = process.env.MEMBERS1ST_HEADERS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") headers[key] = sanitizeHeaderValue(value);
    }
    return headers;
  } catch {
    return {};
  }
}

/**
 * Builds request headers for Members1st API calls.
 * Combines base headers with additional headers, cookie, and authorization.
 * @param base - Base headers to include
 * @returns Complete set of request headers
 */
export function buildRequestHeaders(base: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    ...base,
    ...parseAdditionalHeaders()
  };

  const cookie = getCookieValue();
  if (cookie) headers.Cookie = buildCookieHeader(cookie);

  const authorization = process.env.MEMBERS1ST_AUTHORIZATION;
  if (authorization) headers.Authorization = authorization;

  return headers;
}
