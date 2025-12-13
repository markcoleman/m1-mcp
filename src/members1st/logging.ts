/**
 * ANSI color codes for console output
 */
const Colors = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  
  // Foreground colors
  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",
  
  // Background colors
  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
} as const;

import { envBool } from "./utils.js";

/**
 * Checks if API request logging is enabled.
 * Logging is enabled by default unless NODE_ENV is "production" or LOG_API_REQUESTS is explicitly false.
 * @returns true if API request logging is enabled, false otherwise
 */
export function isApiLoggingEnabled(): boolean {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  const logRequests = process.env.LOG_API_REQUESTS;
  
  // If LOG_API_REQUESTS is explicitly set to a non-empty value, use that value
  if (logRequests !== undefined && logRequests.trim() !== "") {
    return logRequests === "1" || logRequests.toLowerCase() === "true";
  }
  
  // Otherwise, disable in production mode, enable elsewhere
  return nodeEnv !== "production";
}

/**
 * Checks if API response logging is enabled.
 * Response logging requires both LOG_API_RESPONSES to be true AND request logging to be enabled.
 * @returns true if API response logging is enabled, false otherwise
 */
export function isApiResponseLoggingEnabled(): boolean {
  return isApiLoggingEnabled() && envBool("LOG_API_RESPONSES");
}

/**
 * Logs an API request with color coding.
 * @param method - HTTP method (GET, POST, etc.)
 * @param url - Request URL
 * @param headers - Request headers
 */
export function logApiRequest(method: string, url: string, headers: Record<string, string>): void {
  if (!isApiLoggingEnabled()) return;
  
  const timestamp = new Date().toISOString();
  const parsedUrl = new URL(url);
  
  console.error(`${Colors.Dim}[${timestamp}]${Colors.Reset} ${Colors.Bright}${Colors.FgCyan}${method}${Colors.Reset} ${Colors.FgYellow}${parsedUrl.pathname}${Colors.Reset}`);
  
  if (parsedUrl.search) {
    console.error(`${Colors.Dim}Query Parameters:${Colors.Reset}`);
    parsedUrl.searchParams.forEach((value, key) => {
      console.error(`  ${Colors.FgMagenta}${key}${Colors.Reset} = ${Colors.FgGreen}${value}${Colors.Reset}`);
    });
  }
  
  const sanitizedHeaders = { ...headers };
  // Redact sensitive headers
  if (sanitizedHeaders.Cookie) {
    sanitizedHeaders.Cookie = "[REDACTED]";
  }
  if (sanitizedHeaders.Authorization) {
    sanitizedHeaders.Authorization = "[REDACTED]";
  }
  
  console.error(`${Colors.Dim}Headers:${Colors.Reset}`);
  Object.entries(sanitizedHeaders).forEach(([key, value]) => {
    console.error(`  ${Colors.FgBlue}${key}${Colors.Reset}: ${value}`);
  });
  console.error(""); // Empty line for readability
}

/**
 * Logs an API response with color coding.
 * @param url - Request URL
 * @param statusCode - HTTP status code
 * @param statusMessage - HTTP status message
 * @param body - Response body (will be truncated if too long)
 */
export function logApiResponse(url: string, statusCode: number, statusMessage: string, body: string): void {
  if (!isApiResponseLoggingEnabled()) return;
  
  const timestamp = new Date().toISOString();
  const parsedUrl = new URL(url);
  
  const statusColor = statusCode >= 200 && statusCode < 300 ? Colors.FgGreen : Colors.FgRed;
  
  console.error(`${Colors.Dim}[${timestamp}]${Colors.Reset} ${Colors.Bright}Response${Colors.Reset} ${statusColor}${statusCode} ${statusMessage}${Colors.Reset} ${Colors.FgYellow}${parsedUrl.pathname}${Colors.Reset}`);
  
  if (body) {
    const maxBodyLength = 500;
    const truncated = body.length > maxBodyLength;
    const displayBody = truncated ? body.slice(0, maxBodyLength) + "..." : body;
    
    console.error(`${Colors.Dim}Body:${Colors.Reset}`);
    console.error(`${Colors.Dim}${displayBody}${Colors.Reset}`);
    
    if (truncated) {
      console.error(`${Colors.Dim}(truncated, total length: ${body.length} bytes)${Colors.Reset}`);
    }
  }
  console.error(""); // Empty line for readability
}
