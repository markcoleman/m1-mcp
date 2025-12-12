export type Account = {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit";
  currency: string;
  balance: number;
};

export type Transaction = {
  id: string;
  accountId: string;
  postedAt: string; // ISO date
  description: string;
  amount: number; // negative = debit, positive = credit
  currency: string;
};

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

export function getAllAccounts(): Account[] {
  return accounts.slice();
}

export function getAccountById(accountId: string): Account | undefined {
  return accounts.find((a) => a.id === accountId);
}

export function getTransactionsForAccount(accountId: string): Transaction[] {
  return transactions.filter((t) => t.accountId === accountId);
}
