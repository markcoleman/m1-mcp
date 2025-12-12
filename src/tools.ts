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
    accountId: z.string().min(1)
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

export async function handleGetAccountTransactions(accountId: string) {
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
    transactions: await getTransactionsForAccount(accountId)
  };
}
