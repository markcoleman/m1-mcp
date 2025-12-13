import { z } from "zod";
import {
  getAccountById,
  getAllAccounts,
  getTransactionsForAccount
} from "./data.js";

export const ToolNames = {
  GetAllAccounts: "get_all_accounts",
  GetAccountDetails: "get_account_details",
  GetAccountTransactions: "get_account_transactions"
} as const;

export const schemas = {
  getAccountDetails: z.object({
    accountId: z.string().min(1)
  }),
  getAccountTransactions: z.object({
    accountId: z.string().min(1),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    // The underlying API supports a maximum of 180 days per request (no paging).
    days: z.number().int().positive().max(180).optional(),
    billpayOnly: z.boolean().optional(),
    advanced: z.boolean().optional(),
    actionCode: z.string().optional(),
    sourceCode: z.string().optional()
  })
};

export async function handleGetAllAccounts() {
  return {
    accounts: await getAllAccounts()
  };
}

export async function handleGetAccountDetails(accountId: string) {
  const account = await getAccountById(accountId);
  if (!account) {
    return {
      error: {
        code: "NOT_FOUND",
        message: `Account not found: ${accountId}`
      }
    };
  }

  return { account };
}

export async function handleGetAccountTransactions(
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
) {
  const account = await getAccountById(accountId);
  if (!account) {
    return {
      error: {
        code: "NOT_FOUND",
        message: `Account not found: ${accountId}`
      }
    };
  }

  return {
    account,
    transactions: await getTransactionsForAccount(accountId, opts)
  };
}
