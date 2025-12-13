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

  const cookie = process.env.MEMBERS1ST_COOKIE;
  if (cookie) headers.Cookie = buildCookieHeader(cookie);

  const authorization = process.env.MEMBERS1ST_AUTHORIZATION;
  if (authorization) headers.Authorization = authorization;

  return headers;
}
