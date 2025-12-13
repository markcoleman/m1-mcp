import type { Account, Transaction } from "../data.js";
import { httpGet, parseJson, extractArray } from "./http.js";
import { buildRequestHeaders } from "./headers.js";
import { 
  normalizeTransactionSearchOptions, 
  parseIsoDateOnly, 
  chunkDateRange, 
  daysBetween,
  type TransactionSearchOptions 
} from "./date-utils.js";
import { mapMembers1stAccountDetails, mapTransaction } from "./mappers.js";
import { envBool, envNumber } from "./utils.js";

/** Default Members1st accounts API endpoint */
const DEFAULT_ACCOUNTS_URL = "https://myonline.members1st.org/api/v1/account";
/** Default Members1st transactions API endpoint base */
const DEFAULT_TRANSACTIONS_URL_BASE = "https://myonline.members1st.org/api/v1/Transactions";
/** Default origin for Members1st requests */
const DEFAULT_ORIGIN = "https://myonline.members1st.org";

/** Default cache TTL for accounts data (30 seconds) */
const DEFAULT_ACCOUNTS_CACHE_TTL_MS = 30_000;
/** Maximum number of HTTP redirects to follow */
const DEFAULT_MAX_REDIRECTS = 5;

type Cached<T> = {
  value: T;
  expiresAtMs: number;
};

let accountsCache: Cached<Account[]> | undefined;

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
  
  // Validate date range before chunking
  const parsedStart = parseIsoDateOnly(search.startDate);
  const parsedEnd = parseIsoDateOnly(search.endDate);
  
  if (!parsedStart || !parsedEnd) {
    throw new Error(
      `Members1st transactions fetch failed: invalid date format. startDate: ${search.startDate}, endDate: ${search.endDate}`
    );
  }
  
  if (parsedStart > parsedEnd) {
    throw new Error(
      `Members1st transactions fetch failed: startDate must be before or equal to endDate. startDate: ${search.startDate}, endDate: ${search.endDate}`
    );
  }
  
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
