export type Account = {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit";
  currency: string;
  balance: number;
  members1st?: {
    accountKey: string;
    productId: string;
    productCode?: string;
  };
};

export type Transaction = {
  id: string;
  accountId: string;
  postedAt: string; // ISO date
  description: string;
  amount: number; // negative = debit, positive = credit
  currency: string;
};

import { fetchMembers1stAccounts, fetchMembers1stTransactions } from "./members1st.js";

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

function dataSource(): string {
  return (process.env.DATA_SOURCE ?? "mock").toLowerCase();
}

export async function getAllAccounts(): Promise<Account[]> {
  if (dataSource() === "members1st") {
    return fetchMembers1stAccounts();
  }
  return accounts.slice();
}

export async function getAccountById(accountId: string): Promise<Account | undefined> {
  const all = await getAllAccounts();
  return all.find((a) => a.id === accountId);
}

export async function getTransactionsForAccount(
  accountId: string,
  opts?: {
    startDate?: string;
    endDate?: string;
    days?: number;
    billpayOnly?: boolean;
    advanced?: boolean;
    actionCode?: string;
    sourceCode?: string;
  }
): Promise<Transaction[]> {
  if (dataSource() === "members1st") {
    return fetchMembers1stTransactions(accountId, opts);
  }
  return transactions.filter((t) => t.accountId === accountId);
}
