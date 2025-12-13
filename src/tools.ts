import { z } from "zod";
import {
  getAccountById,
  getAllAccounts,
  getTransactionsForAccount
} from "./data.js";

/**
 * MCP tool names exposed by this server.
 */
export const ToolNames = {
  GetAllAccounts: "get_all_accounts",
  GetAccountDetails: "get_account_details",
  GetAccountTransactions: "get_account_transactions"
} as const;

/**
 * Zod schemas for validating tool input arguments.
 */
export const schemas = {
  getAccountDetails: z.object({
    accountId: z.string().min(1)
  }),
  getAccountTransactions: z.object({
    accountId: z.string().min(1),
    startDate: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().optional().describe("End date in YYYY-MM-DD format")
  })
};

/**
 * Handler for the get_all_accounts tool.
 * Retrieves all accounts from the configured data source.
 *
 * @returns Object containing an array of all accounts
 */
export async function handleGetAllAccounts() {
  return {
    accounts: await getAllAccounts()
  };
}

/**
 * Handler for the get_account_details tool.
 * Retrieves detailed information for a specific account.
 *
 * @param accountId - The unique identifier of the account to retrieve
 * @returns Object containing the account details, or an error if not found
 */
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

/**
 * Handler for the get_account_transactions tool.
 * Retrieves transactions for a specific account with optional date filtering.
 * If the date range exceeds 180 days, the request is automatically chunked and responses are merged.
 *
 * @param accountId - The unique identifier of the account
 * @param opts - Optional filters for the transaction query
 * @param opts.startDate - Start date in YYYY-MM-DD format (defaults to 30 days ago)
 * @param opts.endDate - End date in YYYY-MM-DD format (defaults to today)
 * @returns Object containing account details and transactions, or an error if account not found
 */
export async function handleGetAccountTransactions(
  accountId: string,
  opts?: {
    startDate?: string;
    endDate?: string;
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
