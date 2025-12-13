import type { Account, Transaction } from "./data.js";

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { URL } from "node:url";

/** Default Members1st accounts API endpoint */
const DEFAULT_ACCOUNTS_URL = "https://myonline.members1st.org/api/v1/account";
/** Default Members1st transactions API endpoint base */
const DEFAULT_TRANSACTIONS_URL_BASE = "https://myonline.members1st.org/api/v1/Transactions";
/** Default origin for Members1st requests */
const DEFAULT_ORIGIN = "https://myonline.members1st.org";

/** Default cache TTL for accounts data (30 seconds) */
const DEFAULT_ACCOUNTS_CACHE_TTL_MS = 30_000;
/** Default number of days to retrieve transactions */
const DEFAULT_TRANSACTION_DAYS = 30;
/** Maximum number of days supported by Members1st API (no paging available) */
const MAX_TRANSACTION_DAYS = 180;
/** Maximum number of HTTP redirects to follow */
const DEFAULT_MAX_REDIRECTS = 5;

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

/**
 * Checks if API request logging is enabled.
 * Logging is enabled by default unless NODE_ENV is "production" or LOG_API_REQUESTS is explicitly false.
 * @returns true if API request logging is enabled, false otherwise
 */
function isApiLoggingEnabled(): boolean {
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
function isApiResponseLoggingEnabled(): boolean {
  return isApiLoggingEnabled() && envBool("LOG_API_RESPONSES");
}

/**
 * Logs an API request with color coding.
 * @param method - HTTP method (GET, POST, etc.)
 * @param url - Request URL
 * @param headers - Request headers
 */
function logApiRequest(method: string, url: string, headers: Record<string, string>): void {
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
function logApiResponse(url: string, statusCode: number, statusMessage: string, body: string): void {
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

/**
 * Parses an environment variable as a boolean.
 * Accepts "1" or "true" (case-insensitive) as true values.
 * @param name - Environment variable name
 * @returns true if the value is "1" or "true", false otherwise
 */
function envBool(name: string): boolean {
  const v = process.env[name];
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true";
}

/**
 * Parses an environment variable as a number with a fallback.
 * @param name - Environment variable name
 * @param fallback - Default value if variable is not set or invalid
 * @returns Parsed number or fallback value
 */
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type Cached<T> = {
  value: T;
  expiresAtMs: number;
};

let accountsCache: Cached<Account[]> | undefined;

type HttpResult = {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

function parseJson(body: string | undefined): any {
  return JSON.parse(body || "null") as any;
}

function extractArray(json: any, preferredKeys: string[]): any[] {
  if (Array.isArray(json)) return json;
  for (const key of preferredKeys) {
    if (Array.isArray(json?.[key])) return json[key];
  }
  return [];
}

/**
 * Sanitizes HTTP header values to prevent header injection attacks.
 * Removes newline characters and trims whitespace.
 * @param value - Raw header value
 * @returns Sanitized header value
 */
function sanitizeHeaderValue(value: string): string {
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
function buildCookieHeader(raw: string): string {
  const sanitized = sanitizeHeaderValue(raw);
  // If caller already provided a full Cookie header value that includes M1Online, keep it.
  if (/(^|;\s*)m1online=/i.test(sanitized)) return sanitized;

  // If they provided just the cookie value (common when copy/pasting from storage),
  // wrap it with the expected cookie name.
  if (!sanitized.includes("=")) return `M1Online=${sanitized}`;

  // Otherwise, assume they provided a complete cookie string (maybe multiple cookies).
  return sanitized;
}

async function httpGet(urlString: string, headers: Record<string, string>, maxRedirects = 5): Promise<HttpResult> {
  let current = new URL(urlString);
  
  // Log the initial request
  logApiRequest("GET", urlString, headers);

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const res = await httpGetOnce(current, headers);

    const location = res.headers.location;
    const status = res.statusCode;
    const isRedirect = status === 301 || status === 302 || status === 303 || status === 307 || status === 308;

    if (isRedirect && location) {
      current = new URL(Array.isArray(location) ? location[0] : location, current);
      continue;
    }
    
    // Log the response
    logApiResponse(urlString, res.statusCode, res.statusMessage, res.body);

    return res;
  }

  throw new Error(`Members1st accounts fetch failed: too many redirects (${maxRedirects})`);
}

function httpGetOnce(url: URL, headers: Record<string, string>): Promise<HttpResult> {
  const maxBytes = 5_000_000;
  const reqFn = url.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const req = reqFn(
      url,
      {
        method: "GET",
        headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;

        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes) {
            req.destroy(new Error("Response body too large"));
            return;
          }
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            statusCode: res.statusCode ?? 0,
            statusMessage: res.statusMessage ?? "",
            headers: res.headers as Record<string, string | string[] | undefined>,
            body
          });
        });

        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.end();
  });
}

/**
 * Parses additional headers from MEMBERS1ST_HEADERS_JSON environment variable.
 * Expected format: JSON object with string keys and values.
 * @returns Object containing parsed headers, or empty object if invalid/missing
 */
function parseAdditionalHeaders(): Record<string, string> {
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
function buildRequestHeaders(base: Record<string, string>): Record<string, string> {
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

type TransactionSearchOptions = {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

type NormalizedTransactionSearch = {
  startDate: string;
  endDate: string;
};

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseIsoDateOnly(s: string): Date | undefined {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function normalizeTransactionSearchOptions(opts: TransactionSearchOptions): NormalizedTransactionSearch {
  const endDate = opts.endDate ?? isoDateOnly(new Date());

  const startDate =
    opts.startDate ??
    (() => {
      const end = parseIsoDateOnly(endDate) ?? new Date();
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - DEFAULT_TRANSACTION_DAYS);
      return isoDateOnly(d);
    })();

  return {
    startDate,
    endDate
  };
}

/**
 * Calculates the number of days between two dates.
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Number of days between the dates
 */
function daysBetween(startDate: string, endDate: string): number {
  const start = parseIsoDateOnly(startDate);
  const end = parseIsoDateOnly(endDate);
  
  // If either date is invalid, return a safe default
  if (!start || !end) {
    return DEFAULT_TRANSACTION_DAYS;
  }
  
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Chunks a date range into segments of at most MAX_TRANSACTION_DAYS days.
 * Each chunk covers exactly MAX_TRANSACTION_DAYS days (inclusive) except the last chunk.
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of date range chunks, each with startDate and endDate
 */
function chunkDateRange(startDate: string, endDate: string): Array<{ startDate: string; endDate: string }> {
  const totalDays = daysBetween(startDate, endDate);
  
  if (totalDays <= MAX_TRANSACTION_DAYS) {
    return [{ startDate, endDate }];
  }

  const chunks: Array<{ startDate: string; endDate: string }> = [];
  const parsedStart = parseIsoDateOnly(startDate);
  const parsedEnd = parseIsoDateOnly(endDate);
  
  // If dates are invalid, return a single chunk with the original dates
  if (!parsedStart || !parsedEnd) {
    return [{ startDate, endDate }];
  }
  
  let currentStart = parsedStart;
  const finalEnd = parsedEnd;

  while (currentStart <= finalEnd) {
    // Calculate the end of this chunk (MAX_TRANSACTION_DAYS - 1 to make it inclusive)
    // E.g., start on day 0, add 179 days = day 179, which is 180 days inclusive
    const chunkEnd = new Date(currentStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + MAX_TRANSACTION_DAYS - 1);
    
    // The actual end is either the chunk end or the final end, whichever is earlier
    const actualEnd = chunkEnd > finalEnd ? finalEnd : chunkEnd;
    
    chunks.push({
      startDate: isoDateOnly(currentStart),
      endDate: isoDateOnly(actualEnd)
    });
    
    // If we've reached or passed the final end, we're done
    if (actualEnd >= finalEnd) {
      break;
    }
    
    // Move to the next chunk (day after the end of this chunk)
    currentStart = new Date(actualEnd);
    currentStart.setUTCDate(currentStart.getUTCDate() + 1);
  }

  return chunks;
}

function toIsoDateOnly(v: unknown): string {
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return isoDateOnly(d);
    return v;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) return isoDateOnly(v);
  return isoDateOnly(new Date());
}

function pickAmount(item: any): number {
  const direct = pickNumber(item?.amount ?? item?.transactionAmount ?? item?.value ?? item?.netAmount);
  if (typeof direct === "number") return direct;

  const debit = pickNumber(item?.debit ?? item?.debitAmount);
  const credit = pickNumber(item?.credit ?? item?.creditAmount);
  if (typeof debit === "number" || typeof credit === "number") {
    return (credit ?? 0) - (debit ?? 0);
  }

  // Some APIs use separate sign indicators.
  const signed = pickNumber(item?.signedAmount);
  if (typeof signed === "number") return signed;

  return 0;
}

function mapTransaction(item: any, accountId: string, index: number): Transaction {
  const id = String(
    item?.id ?? item?.activityId ?? item?.transactionId ?? item?.key ?? `txn_${String(index + 1).padStart(4, "0")}`
  );
  const postedAt = toIsoDateOnly(
    item?.postedAt ??
      item?.postedDate ??
      item?.postDate ??
      item?.date ??
      item?.activityDate ??
      item?.transactionDate ??
      item?.effectiveDate
  );
  const description = String(item?.description ?? item?.memo ?? item?.payee ?? item?.name ?? item?.details ?? id);
  const amount = pickAmount(item);
  const currency = String(item?.currency ?? item?.currencyCode ?? item?.isoCurrencyCode ?? "USD");
  return { id, accountId, postedAt, description, amount, currency };
}

function inferType(raw: unknown): Account["type"] {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("draft")) return "checking";
  if (s.includes("share")) return "savings";
  if (s.includes("sav")) return "savings";
  if (s.includes("loan") || s.includes("loc") || s.includes("hefloc") || s.includes("lineofcredit")) return "credit";
  if (s.includes("credit") || s.includes("cc") || s.includes("card")) return "credit";
  return "checking";
}

function inferTypeFromMany(...values: unknown[]): Account["type"] {
  for (const v of values) {
    const s = String(v ?? "").toLowerCase();
    if (!s) continue;
    if (s.includes("draft")) return "checking";
    if (s.includes("share") || s.includes("sav")) return "savings";
    if (s.includes("loan") || s.includes("loc") || s.includes("hefloc") || s.includes("lineofcredit")) return "credit";
    if (s.includes("credit") || s.includes("cc") || s.includes("card")) return "credit";
  }
  return "checking";
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function mapAccount(item: any, index: number): Account {
  const id =
    String(
      item?.id ??
        item?.accountId ??
        item?.account_id ??
        item?.accountKey ??
        item?.accountNumber ??
        item?.number ??
        item?.maskedAccountNumber ??
        `acct_${String(index + 1).padStart(3, "0")}`
    );

  const name = String(
    item?.name ??
      item?.nickname ??
      item?.productName ??
      item?.product ??
      item?.description ??
      item?.accountDescription ??
      id
  );

  const type = inferType(item?.type ?? item?.accountType ?? item?.category ?? item?.productType);

  const currency = String(item?.currency ?? item?.currencyCode ?? item?.isoCurrencyCode ?? "USD");

  const balance =
    pickNumber(item?.balance) ??
    pickNumber(item?.availableBalance) ??
    pickNumber(item?.currentBalance) ??
    pickNumber(item?.ledgerBalance) ??
    0;

  return { id, name, type, currency, balance };
}

function mapMembers1stProduct(parent: any, product: any, parentKey: string, productIndex: number): Account {
  const productId = String(
    product?.id ?? product?.productId ?? product?.product_id ?? `p_${String(productIndex + 1).padStart(2, "0")}`
  );
  const id = `${parentKey}:${productId}`;

  const productName = String(
    product?.description?.full ??
      product?.description?.sanitized ??
      product?.nickname ??
      product?.name ??
      product?.code ??
      productId
  );

  const parentLabel = String(parent?.nickname ?? parent?.maskedAccountNumber ?? parent?.accountNumber ?? parentKey);
  const name = parentLabel ? `${parentLabel} - ${productName}` : productName;

  const type = inferTypeFromMany(
    product?.$type,
    product?.code,
    productName,
    product?.loanType,
    product?.purposeCode
  );

  const currency = String(product?.currency ?? product?.currencyCode ?? product?.isoCurrencyCode ?? "USD");

  const balance =
    pickNumber(product?.availableBalance) ??
    pickNumber(product?.balance) ??
    pickNumber(product?.currentBalance) ??
    pickNumber(product?.ledgerBalance) ??
    0;

  const members1st = {
    accountKey: parentKey,
    productId,
    productCode: typeof product?.code === "string" ? product.code : undefined
  };

  return { id, name, type, currency, balance, members1st };
}

function mapMembers1stAccountDetails(details: any, detailsIndex: number): Account[] {
  const parentKey = String(
    details?.accountKey ??
      details?.accountNumber ??
      details?.maskedAccountNumber ??
      `acct_${String(detailsIndex + 1).padStart(3, "0")}`
  );

  const products: any[] = Array.isArray(details?.products) ? details.products : [];
  if (products.length === 0) {
    // Fallback to legacy mapping if the API returns a flat list.
    return [mapAccount(details, detailsIndex)];
  }

  return products.map((p, idx) => mapMembers1stProduct(details, p, parentKey, idx));
}

/**
 * Fetches all accounts from the Members1st API.
 * Results are cached for MEMBERS1ST_CACHE_TTL_MS milliseconds (default 30s).
 * @returns Promise resolving to array of accounts
 * @throws Error if the HTTP request fails or returns non-2xx status
 */
export async function fetchMembers1stAccounts(): Promise<Account[]> {
  const ttlMs = envNumber("MEMBERS1ST_CACHE_TTL_MS", DEFAULT_ACCOUNTS_CACHE_TTL_MS);
  const now = Date.now();
  if (!envBool("MEMBERS1ST_DISABLE_CACHE") && accountsCache && accountsCache.expiresAtMs > now) return accountsCache.value;

  const url = process.env.MEMBERS1ST_ACCOUNTS_URL ?? DEFAULT_ACCOUNTS_URL;
  const headers = buildRequestHeaders({ Accept: "application/json" });

  const res = await httpGet(url, headers, DEFAULT_MAX_REDIRECTS);

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const text = res.body ?? "";
    throw new Error(
      `Members1st accounts fetch failed: ${res.statusCode} ${res.statusMessage}${text ? ` - ${text.slice(0, 300)}` : ""}`
    );
  }

  const json = parseJson(res.body);
  const items: any[] = extractArray(json, ["accounts", "data"]);

  const mapped = items.flatMap((item, idx) => mapMembers1stAccountDetails(item, idx));

  if (!envBool("MEMBERS1ST_DISABLE_CACHE") && ttlMs > 0) {
    accountsCache = { value: mapped, expiresAtMs: now + ttlMs };
  }

  return mapped;
}

/**
 * Fetches transactions for a single date range chunk from the Members1st API.
 * This is an internal helper that fetches at most 180 days of transactions.
 * @param accountId - The account ID (format: accountKey:productId)
 * @param accountKey - Account key from Members1st system
 * @param productId - Product ID from Members1st system
 * @param productCode - Product code (Draft, Share, etc.)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Promise resolving to array of transactions
 * @throws Error if HTTP request fails
 */
async function fetchMembers1stTransactionsChunk(
  accountId: string,
  accountKey: string,
  productId: string,
  productCode: string | undefined,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const base = process.env.MEMBERS1ST_TRANSACTIONS_URL_BASE ?? DEFAULT_TRANSACTIONS_URL_BASE;
  const url = new URL(`${base.replace(/\/$/, "")}/${encodeURIComponent(accountKey)}/${encodeURIComponent(productId)}`);

  // Calculate days for this chunk
  const days = daysBetween(startDate, endDate);
  
  // Set query parameters with defaults for the simplified API
  url.searchParams.set("billpayOnly", "false");
  url.searchParams.set("days", String(days));
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("advanced", "true");
  url.searchParams.set("actionCode", "*");
  url.searchParams.set("sourceCode", "*");

  const origin = process.env.MEMBERS1ST_ORIGIN ?? DEFAULT_ORIGIN;
  const referer = productCode
    ? `${origin.replace(/\/$/, "")}/mega/product-details/transactions?id=${encodeURIComponent(productId)}&type=${encodeURIComponent(productCode)}`
    : `${origin.replace(/\/$/, "")}/mega/product-details/transactions?id=${encodeURIComponent(productId)}`;

  const headers = buildRequestHeaders({
    Accept: "application/json, text/plain, */*",
    Origin: origin,
    Referer: referer
  });

  const res = await httpGet(url.toString(), headers, DEFAULT_MAX_REDIRECTS);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const text = res.body ?? "";
    throw new Error(
      `Members1st transactions fetch failed: ${res.statusCode} ${res.statusMessage}${text ? ` - ${text.slice(0, 300)}` : ""}`
    );
  }

  const json = parseJson(res.body);
  const items: any[] = extractArray(json, ["transactions", "items", "data"]);

  return items.map((t, idx) => mapTransaction(t, accountId, idx));
}

/**
 * Fetches transactions for a specific account from the Members1st API.
 * If the date range exceeds 180 days, the request is automatically chunked and responses are merged.
 * Account ID should be in the format "<accountKey>:<productId>".
 * @param accountId - The account ID (format: accountKey:productId)
 * @param opts - Optional filters for transaction search
 * @param opts.startDate - Start date in YYYY-MM-DD format (defaults to 30 days ago)
 * @param opts.endDate - End date in YYYY-MM-DD format (defaults to today)
 * @returns Promise resolving to array of transactions
 * @throws Error if accountKey/productId cannot be determined or HTTP request fails
 */
export async function fetchMembers1stTransactions(
  accountId: string,
  opts: TransactionSearchOptions = {}
): Promise<Transaction[]> {
  // accountId is expected to be `<accountKey>:<productId>`.
  const [accountKeyFromId, productIdFromId] = accountId.split(":");

  // Best-effort metadata lookup for referer/type; not strictly required by all deployments.
  const allAccounts = await fetchMembers1stAccounts();
  const account = allAccounts.find((a) => a.id === accountId);

  const accountKey = account?.members1st?.accountKey ?? accountKeyFromId;
  const productId = account?.members1st?.productId ?? productIdFromId;

  if (!accountKey || !productId) {
    throw new Error(
      "Members1st transactions fetch failed: missing accountKey/productId. Use an account id returned by get_all_accounts (format: <accountKey>:<productId>)."
    );
  }

  const productCode =
    account?.members1st?.productCode ??
    (account?.type === "checking" ? "Draft" : account?.type === "savings" ? "Share" : undefined);

  const search = normalizeTransactionSearchOptions(opts);
  const chunks = chunkDateRange(search.startDate, search.endDate);

  // Fetch all chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map(chunk =>
      fetchMembers1stTransactionsChunk(
        accountId,
        accountKey,
        productId,
        productCode,
        chunk.startDate,
        chunk.endDate
      )
    )
  );

  // Merge all results and deduplicate by transaction id
  const allTransactions = chunkResults.flat();
  const uniqueTransactions = new Map<string, Transaction>();
  
  for (const txn of allTransactions) {
    if (!uniqueTransactions.has(txn.id)) {
      uniqueTransactions.set(txn.id, txn);
    }
  }

  return Array.from(uniqueTransactions.values());
}
