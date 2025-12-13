/**
 * Represents a financial account (checking, savings, or credit).
 */
export type Account = {
  /** Unique identifier for the account */
  id: string;
  /** Display name of the account */
  name: string;
  /** Type of account */
  type: "checking" | "savings" | "credit";
  /** Currency code (e.g., "USD") */
  currency: string;
  /** Current account balance */
  balance: number;
  /** Members1st-specific metadata (optional) */
  members1st?: {
    /** Account key in Members1st system */
    accountKey: string;
    /** Product ID in Members1st system */
    productId: string;
    /** Product code in Members1st system */
    productCode?: string;
  };
};

/**
 * Represents a financial transaction.
 */
export type Transaction = {
  /** Unique identifier for the transaction */
  id: string;
  /** Account ID this transaction belongs to */
  accountId: string;
  /** Date the transaction was posted (ISO date format) */
  postedAt: string;
  /** Description or memo of the transaction */
  description: string;
  /** Transaction amount (negative = debit, positive = credit) */
  amount: number;
  /** Currency code (e.g., "USD") */
  currency: string;
};

import { fetchMembers1stAccounts, fetchMembers1stTransactions } from "./members1st/index.js";

const accounts: Account[] = [
  {
    id: "acct_001",
    name: "Everyday Checking",
    type: "checking",
    currency: "USD",
    balance: 2450.32
  },
  {
    id: "acct_002",
    name: "Emergency Savings",
    type: "savings",
    currency: "USD",
    balance: 12050.0
  },
  {
    id: "acct_003",
    name: "Rewards Credit Card",
    type: "credit",
    currency: "USD",
    balance: -430.18
  }
];

const transactions: Transaction[] = [
  {
    id: "txn_1001",
    accountId: "acct_001",
    postedAt: "2025-12-09",
    description: "Payroll Deposit",
    amount: 3200.0,
    currency: "USD"
  },
  {
    id: "txn_1002",
    accountId: "acct_001",
    postedAt: "2025-12-10",
    description: "Grocery Store",
    amount: -86.45,
    currency: "USD"
  },
  {
    id: "txn_2001",
    accountId: "acct_002",
    postedAt: "2025-12-05",
    description: "Interest Payment",
    amount: 4.12,
    currency: "USD"
  },
  {
    id: "txn_3001",
    accountId: "acct_003",
    postedAt: "2025-12-08",
    description: "Online Purchase",
    amount: -59.99,
    currency: "USD"
  },
  {
    id: "txn_3002",
    accountId: "acct_003",
    postedAt: "2025-12-11",
    description: "Payment Received",
    amount: 200.0,
    currency: "USD"
  }
];

/**
 * Returns the configured data source from environment.
 * @returns "mock" or "members1st"
 */
function dataSource(): string {
  return (process.env.DATA_SOURCE ?? "mock").toLowerCase();
}

/**
 * Retrieves all accounts from the configured data source.
 * @returns Promise resolving to array of all accounts
 */
export async function getAllAccounts(): Promise<Account[]> {
  if (dataSource() === "members1st") {
    return fetchMembers1stAccounts();
  }
  return accounts.slice();
}

/**
 * Retrieves a specific account by its ID.
 * @param accountId - The unique identifier of the account
 * @returns Promise resolving to the account if found, undefined otherwise
 */
export async function getAccountById(accountId: string): Promise<Account | undefined> {
  const all = await getAllAccounts();
  return all.find((a) => a.id === accountId);
}

/**
 * Retrieves transactions for a specific account with optional date filtering.
 * If the date range exceeds 180 days, requests are automatically chunked and merged.
 * @param accountId - The unique identifier of the account
 * @param opts - Optional filters for transactions
 * @param opts.startDate - Start date in YYYY-MM-DD format (defaults to 30 days ago)
 * @param opts.endDate - End date in YYYY-MM-DD format (defaults to today)
 * @returns Promise resolving to array of transactions
 */
export async function getTransactionsForAccount(
  accountId: string,
  opts?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<Transaction[]> {
  if (dataSource() === "members1st") {
    return fetchMembers1stTransactions(accountId, opts);
  }
  return transactions.filter((t) => t.accountId === accountId);
}
