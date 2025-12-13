import type { Account, Transaction } from "./data.js";

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { URL } from "node:url";

const DEFAULT_ACCOUNTS_URL = "https://myonline.members1st.org/api/v1/account";
const DEFAULT_TRANSACTIONS_URL_BASE = "https://myonline.members1st.org/api/v1/Transactions";
const DEFAULT_ORIGIN = "https://myonline.members1st.org";

const DEFAULT_ACCOUNTS_CACHE_TTL_MS = 30_000;
const DEFAULT_TRANSACTION_DAYS = 30;
const MAX_TRANSACTION_DAYS = 365;
const DEFAULT_MAX_REDIRECTS = 5;

function envBool(name: string): boolean {
  const v = process.env[name];
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true";
}

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

function sanitizeHeaderValue(value: string): string {
  // Prevent invalid header characters; avoid header injection.
  return value.replace(/[\r\n]+/g, " ").trim();
}

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

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const res = await httpGetOnce(current, headers);

    const location = res.headers.location;
    const status = res.statusCode;
    const isRedirect = status === 301 || status === 302 || status === 303 || status === 307 || status === 308;

    if (isRedirect && location) {
      current = new URL(Array.isArray(location) ? location[0] : location, current);
      continue;
    }

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
  days?: number;
  billpayOnly?: boolean;
  advanced?: boolean;
  actionCode?: string;
  sourceCode?: string;
};

type NormalizedTransactionSearch = Required<
  Pick<TransactionSearchOptions, "billpayOnly" | "advanced" | "actionCode" | "sourceCode">
> & {
  days: number;
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

  const daysRaw = typeof opts.days === "number" && Number.isFinite(opts.days) ? opts.days : DEFAULT_TRANSACTION_DAYS;
  const days = Math.max(1, Math.min(MAX_TRANSACTION_DAYS, Math.trunc(daysRaw)));

  const startDate =
    opts.startDate ??
    (() => {
      const end = parseIsoDateOnly(endDate) ?? new Date();
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - days);
      return isoDateOnly(d);
    })();

  return {
    startDate,
    endDate,
    days,
    billpayOnly: opts.billpayOnly ?? false,
    advanced: opts.advanced ?? true,
    actionCode: opts.actionCode ?? "*",
    sourceCode: opts.sourceCode ?? "*"
  };
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

export async function fetchMembers1stAccounts(): Promise<Account[]> {
  const ttlMs = envNumber("MEMBERS1ST_CACHE_TTL_MS", DEFAULT_ACCOUNTS_CACHE_TTL_MS);
  const now = Date.now();
  if (accountsCache && accountsCache.expiresAtMs > now) return accountsCache.value;

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

  const base = process.env.MEMBERS1ST_TRANSACTIONS_URL_BASE ?? DEFAULT_TRANSACTIONS_URL_BASE;
  const url = new URL(`${base.replace(/\/$/, "")}/${encodeURIComponent(accountKey)}/${encodeURIComponent(productId)}`);

  const search = normalizeTransactionSearchOptions(opts);
  url.searchParams.set("billpayOnly", String(search.billpayOnly));
  url.searchParams.set("days", String(search.days));
  url.searchParams.set("startDate", search.startDate);
  url.searchParams.set("endDate", search.endDate);
  url.searchParams.set("advanced", String(search.advanced));
  url.searchParams.set("actionCode", search.actionCode);
  url.searchParams.set("sourceCode", search.sourceCode);

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
