import type { Account } from "./data.js";

import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { URL } from "node:url";

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
      if (typeof value === "string") headers[key] = value;
    }
    return headers;
  } catch {
    return {};
  }
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
  const productId = String(product?.id ?? product?.productId ?? product?.product_id ?? `p_${String(productIndex + 1).padStart(2, "0")}`);
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

  return { id, name, type, currency, balance };
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
  const ttlMs = envNumber("MEMBERS1ST_CACHE_TTL_MS", 30_000);
  const now = Date.now();
  if (accountsCache && accountsCache.expiresAtMs > now) return accountsCache.value;

  const url = process.env.MEMBERS1ST_ACCOUNTS_URL ?? "https://myonline.members1st.org/api/v1/account";

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...parseAdditionalHeaders()
  };

  const cookie = process.env.MEMBERS1ST_COOKIE;
  if (cookie) headers.Cookie = buildCookieHeader(cookie);

  const authorization = process.env.MEMBERS1ST_AUTHORIZATION;
  if (authorization) headers.Authorization = authorization;

  const res = await httpGet(url, headers, 5);

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const text = res.body ?? "";
    throw new Error(
      `Members1st accounts fetch failed: ${res.statusCode} ${res.statusMessage}${text ? ` - ${text.slice(0, 300)}` : ""}`
    );
  }

  const json = JSON.parse(res.body || "null") as any;
  const items: any[] =
    Array.isArray(json) ? json : Array.isArray(json?.accounts) ? json.accounts : Array.isArray(json?.data) ? json.data : [];

  const mapped = items.flatMap((item, idx) => mapMembers1stAccountDetails(item, idx));

  if (!envBool("MEMBERS1ST_DISABLE_CACHE") && ttlMs > 0) {
    accountsCache = { value: mapped, expiresAtMs: now + ttlMs };
  }

  return mapped;
}
