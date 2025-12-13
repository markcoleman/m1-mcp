import type { Account, Transaction } from "../data.js";
import { toIsoDateOnly } from "./date-utils.js";

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
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

export function mapTransaction(item: any, accountId: string, index: number): Transaction {
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

export function mapAccount(item: any, index: number): Account {
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

export function mapMembers1stAccountDetails(details: any, detailsIndex: number): Account[] {
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
