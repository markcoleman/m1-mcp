import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getAllAccounts, getAccountById, getTransactionsForAccount } from "./data.js";

describe("data", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DATA_SOURCE = "mock"; // Ensure we use mock data
  });

  describe("getAllAccounts", () => {
    it("returns array of accounts", async () => {
      const accounts = await getAllAccounts();
      
      assert.ok(Array.isArray(accounts));
      assert.ok(accounts.length > 0);
    });

    it("returns accounts with required fields", async () => {
      const accounts = await getAllAccounts();
      
      accounts.forEach((account) => {
        assert.ok(account.id);
        assert.ok(account.name);
        assert.ok(account.type);
        assert.ok(account.currency);
        assert.ok(typeof account.balance === "number");
      });
    });

    it("returns different account types", async () => {
      const accounts = await getAllAccounts();
      
      const types = new Set(accounts.map((a) => a.type));
      assert.ok(types.has("checking") || types.has("savings") || types.has("credit"));
    });

    it("returns accounts in USD currency", async () => {
      const accounts = await getAllAccounts();
      
      accounts.forEach((account) => {
        assert.equal(account.currency, "USD");
      });
    });

    it("returns a copy of the accounts array", async () => {
      const accounts1 = await getAllAccounts();
      const accounts2 = await getAllAccounts();
      
      // Should be different array instances
      assert.notEqual(accounts1, accounts2);
      
      // But with same content
      assert.deepEqual(accounts1, accounts2);
    });
  });

  describe("getAccountById", () => {
    it("returns account when found", async () => {
      const allAccounts = await getAllAccounts();
      const firstAccount = allAccounts[0];
      
      const account = await getAccountById(firstAccount.id);
      
      assert.ok(account);
      assert.equal(account.id, firstAccount.id);
      assert.equal(account.name, firstAccount.name);
    });

    it("returns undefined when account not found", async () => {
      const account = await getAccountById("nonexistent_account");
      
      assert.equal(account, undefined);
    });

    it("returns account with all required fields", async () => {
      const allAccounts = await getAllAccounts();
      const account = await getAccountById(allAccounts[0].id);
      
      assert.ok(account);
      assert.ok(account.id);
      assert.ok(account.name);
      assert.ok(account.type);
      assert.ok(account.currency);
      assert.ok(typeof account.balance === "number");
    });

    it("handles empty string ID", async () => {
      const account = await getAccountById("");
      
      assert.equal(account, undefined);
    });
  });

  describe("getTransactionsForAccount", () => {
    it("returns array of transactions for valid account", async () => {
      const allAccounts = await getAllAccounts();
      const accountId = allAccounts[0].id;
      
      const transactions = await getTransactionsForAccount(accountId);
      
      assert.ok(Array.isArray(transactions));
    });

    it("returns transactions with required fields", async () => {
      const allAccounts = await getAllAccounts();
      const accountId = allAccounts[0].id;
      
      const transactions = await getTransactionsForAccount(accountId);
      
      if (transactions.length > 0) {
        transactions.forEach((txn) => {
          assert.ok(txn.id);
          assert.ok(txn.accountId);
          assert.ok(txn.postedAt);
          assert.ok(txn.description);
          assert.ok(typeof txn.amount === "number");
          assert.ok(txn.currency);
        });
      }
    });

    it("returns only transactions for specified account", async () => {
      const allAccounts = await getAllAccounts();
      const accountId = allAccounts[0].id;
      
      const transactions = await getTransactionsForAccount(accountId);
      
      transactions.forEach((txn) => {
        assert.equal(txn.accountId, accountId);
      });
    });

    it("returns empty array for account with no transactions", async () => {
      const transactions = await getTransactionsForAccount("nonexistent_account");
      
      assert.ok(Array.isArray(transactions));
      assert.equal(transactions.length, 0);
    });

    it("accepts optional date filters", async () => {
      const allAccounts = await getAllAccounts();
      const accountId = allAccounts[0].id;
      
      const transactions = await getTransactionsForAccount(accountId, {
        startDate: "2025-01-01",
        endDate: "2025-12-31"
      });
      
      assert.ok(Array.isArray(transactions));
    });

    it("handles undefined date options", async () => {
      const allAccounts = await getAllAccounts();
      const accountId = allAccounts[0].id;
      
      const transactions = await getTransactionsForAccount(accountId, undefined);
      
      assert.ok(Array.isArray(transactions));
    });

    it("handles empty date options object", async () => {
      const allAccounts = await getAllAccounts();
      const accountId = allAccounts[0].id;
      
      const transactions = await getTransactionsForAccount(accountId, {});
      
      assert.ok(Array.isArray(transactions));
    });
  });
});
