import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  handleGetAllAccounts,
  handleGetAccountDetails,
  handleGetAccountTransactions
} from "./tools.js";

describe("tools", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DATA_SOURCE = "mock"; // Ensure we use mock data
  });

  describe("handleGetAllAccounts", () => {
    it("returns object with accounts array", async () => {
      const result = await handleGetAllAccounts();
      
      assert.ok(result);
      assert.ok(Array.isArray(result.accounts));
    });

    it("returns multiple accounts", async () => {
      const result = await handleGetAllAccounts();
      
      assert.ok(result.accounts.length > 0);
    });

    it("accounts have required fields", async () => {
      const result = await handleGetAllAccounts();
      
      result.accounts.forEach((account) => {
        assert.ok(account.id);
        assert.ok(account.name);
        assert.ok(account.type);
        assert.ok(account.currency);
        assert.ok(typeof account.balance === "number");
      });
    });

    it("accounts have valid types", async () => {
      const result = await handleGetAllAccounts();
      const validTypes = ["checking", "savings", "credit"];
      
      result.accounts.forEach((account) => {
        assert.ok(validTypes.includes(account.type));
      });
    });
  });

  describe("handleGetAccountDetails", () => {
    it("returns account object when found", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountDetails(firstId);
      
      assert.ok(result);
      assert.ok(result.account);
      assert.equal(result.account.id, firstId);
    });

    it("returns error object when account not found", async () => {
      const result = await handleGetAccountDetails("nonexistent_account");
      
      assert.ok(result);
      assert.ok(result.error);
      assert.equal(result.error.code, "NOT_FOUND");
      assert.ok(result.error.message.includes("nonexistent_account"));
    });

    it("error includes NOT_FOUND code", async () => {
      const result = await handleGetAccountDetails("missing_id");
      
      assert.ok(result.error);
      assert.equal(result.error.code, "NOT_FOUND");
    });

    it("error message includes account ID", async () => {
      const testId = "test_missing_123";
      const result = await handleGetAccountDetails(testId);
      
      assert.ok(result.error);
      assert.ok(result.error.message.includes(testId));
    });

    it("returns account with all required fields", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountDetails(firstId);
      
      assert.ok(result.account);
      assert.ok(result.account.id);
      assert.ok(result.account.name);
      assert.ok(result.account.type);
      assert.ok(result.account.currency);
      assert.ok(typeof result.account.balance === "number");
    });

    it("does not include error when account found", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountDetails(firstId);
      
      assert.equal(result.error, undefined);
    });

    it("does not include account when error returned", async () => {
      const result = await handleGetAccountDetails("nonexistent");
      
      assert.equal(result.account, undefined);
    });
  });

  describe("handleGetAccountTransactions", () => {
    it("returns account and transactions when found", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId);
      
      assert.ok(result);
      assert.ok(result.account);
      assert.ok(Array.isArray(result.transactions));
    });

    it("returns error when account not found", async () => {
      const result = await handleGetAccountTransactions("nonexistent_account");
      
      assert.ok(result);
      assert.ok(result.error);
      assert.equal(result.error.code, "NOT_FOUND");
    });

    it("transactions have required fields", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId);
      
      if (result.transactions && result.transactions.length > 0) {
        result.transactions.forEach((txn) => {
          assert.ok(txn.id);
          assert.ok(txn.accountId);
          assert.ok(txn.postedAt);
          assert.ok(txn.description);
          assert.ok(typeof txn.amount === "number");
          assert.ok(txn.currency);
        });
      }
    });

    it("all transactions belong to requested account", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId);
      
      if (result.transactions && result.transactions.length > 0) {
        result.transactions.forEach((txn) => {
          assert.equal(txn.accountId, firstId);
        });
      }
    });

    it("accepts optional date range", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId, {
        startDate: "2025-01-01",
        endDate: "2025-12-31"
      });
      
      assert.ok(result);
      assert.ok(Array.isArray(result.transactions));
    });

    it("accepts only startDate", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId, {
        startDate: "2025-01-01"
      });
      
      assert.ok(result);
      assert.ok(Array.isArray(result.transactions));
    });

    it("accepts only endDate", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId, {
        endDate: "2025-12-31"
      });
      
      assert.ok(result);
      assert.ok(Array.isArray(result.transactions));
    });

    it("works without date options", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId);
      
      assert.ok(result);
      assert.ok(Array.isArray(result.transactions));
    });

    it("error includes NOT_FOUND code", async () => {
      const result = await handleGetAccountTransactions("missing_id");
      
      assert.ok(result.error);
      assert.equal(result.error.code, "NOT_FOUND");
    });

    it("error message includes account ID", async () => {
      const testId = "test_missing_456";
      const result = await handleGetAccountTransactions(testId);
      
      assert.ok(result.error);
      assert.ok(result.error.message.includes(testId));
    });

    it("does not include error when account found", async () => {
      const allAccounts = await handleGetAllAccounts();
      const firstId = allAccounts.accounts[0].id;
      
      const result = await handleGetAccountTransactions(firstId);
      
      assert.equal(result.error, undefined);
    });

    it("does not include account/transactions when error returned", async () => {
      const result = await handleGetAccountTransactions("nonexistent");
      
      assert.equal(result.account, undefined);
      assert.equal(result.transactions, undefined);
    });
  });
});
