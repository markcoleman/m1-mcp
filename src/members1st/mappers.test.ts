import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapTransaction, mapAccount, mapMembers1stAccountDetails } from "./mappers.js";

describe("mappers", () => {
  describe("mapTransaction", () => {
    it("maps transaction with standard fields", () => {
      const item = {
        id: "txn_123",
        postedAt: "2025-12-13",
        description: "Coffee Shop",
        amount: -5.50,
        currency: "USD"
      };
      
      const result = mapTransaction(item, "acct_001", 0);
      
      assert.equal(result.id, "txn_123");
      assert.equal(result.accountId, "acct_001");
      assert.equal(result.postedAt, "2025-12-13");
      assert.equal(result.description, "Coffee Shop");
      assert.equal(result.amount, -5.50);
      assert.equal(result.currency, "USD");
    });

    it("generates ID from index when missing", () => {
      const item = {
        description: "Test",
        amount: 10
      };
      
      const result = mapTransaction(item, "acct_001", 5);
      
      assert.equal(result.id, "txn_0006");
    });

    it("picks ID from alternative fields", () => {
      const tests = [
        { activityId: "act_123" },
        { transactionId: "trans_456" },
        { key: "key_789" }
      ];
      
      tests.forEach((item) => {
        const result = mapTransaction(item, "acct_001", 0);
        assert.ok(result.id.length > 0);
      });
    });

    it("picks date from alternative fields", () => {
      const tests = [
        { postedDate: "2025-12-10" },
        { postDate: "2025-12-11" },
        { date: "2025-12-12" },
        { activityDate: "2025-12-13" },
        { transactionDate: "2025-12-14" },
        { effectiveDate: "2025-12-15" }
      ];
      
      tests.forEach((item) => {
        const result = mapTransaction(item, "acct_001", 0);
        assert.ok(result.postedAt.length > 0);
      });
    });

    it("picks description from alternative fields", () => {
      const tests = [
        { memo: "Memo text" },
        { payee: "Payee name" },
        { name: "Name field" },
        { details: "Details text" }
      ];
      
      tests.forEach((item) => {
        const result = mapTransaction(item, "acct_001", 0);
        assert.ok(result.description.length > 0);
      });
    });

    it("calculates amount from debit and credit", () => {
      const item = {
        debit: 10,
        credit: 25
      };
      
      const result = mapTransaction(item, "acct_001", 0);
      
      assert.equal(result.amount, 15); // 25 - 10
    });

    it("handles debit only", () => {
      const item = {
        debit: 10
      };
      
      const result = mapTransaction(item, "acct_001", 0);
      
      assert.equal(result.amount, -10);
    });

    it("handles credit only", () => {
      const item = {
        credit: 20
      };
      
      const result = mapTransaction(item, "acct_001", 0);
      
      assert.equal(result.amount, 20);
    });

    it("picks amount from alternative fields", () => {
      const tests = [
        { transactionAmount: 15 },
        { value: 20 },
        { netAmount: 25 },
        { signedAmount: -30 }
      ];
      
      tests.forEach((item) => {
        const result = mapTransaction(item, "acct_001", 0);
        assert.ok(typeof result.amount === "number");
      });
    });

    it("defaults amount to 0 when not found", () => {
      const item = {
        description: "Test"
      };
      
      const result = mapTransaction(item, "acct_001", 0);
      
      assert.equal(result.amount, 0);
    });

    it("defaults currency to USD", () => {
      const item = {
        description: "Test",
        amount: 10
      };
      
      const result = mapTransaction(item, "acct_001", 0);
      
      assert.equal(result.currency, "USD");
    });

    it("picks currency from alternative fields", () => {
      const tests = [
        { currencyCode: "EUR" },
        { isoCurrencyCode: "GBP" }
      ];
      
      tests.forEach((item) => {
        const result = mapTransaction(item, "acct_001", 0);
        assert.ok(result.currency.length > 0);
      });
    });
  });

  describe("mapAccount", () => {
    it("maps account with standard fields", () => {
      const item = {
        id: "acct_123",
        name: "Checking Account",
        type: "checking",
        currency: "USD",
        balance: 1000.50
      };
      
      const result = mapAccount(item, 0);
      
      assert.equal(result.id, "acct_123");
      assert.equal(result.name, "Checking Account");
      assert.equal(result.type, "checking");
      assert.equal(result.currency, "USD");
      assert.equal(result.balance, 1000.50);
    });

    it("generates ID from index when missing", () => {
      const item = {
        name: "Test Account"
      };
      
      const result = mapAccount(item, 5);
      
      assert.equal(result.id, "acct_006");
    });

    it("picks ID from alternative fields", () => {
      const tests = [
        { accountId: "acc_123" },
        { account_id: "acc_456" },
        { accountKey: "key_789" },
        { accountNumber: "1234567890" },
        { number: "0987654321" },
        { maskedAccountNumber: "****1234" }
      ];
      
      tests.forEach((item) => {
        const result = mapAccount(item, 0);
        assert.ok(result.id.length > 0);
      });
    });

    it("picks name from alternative fields", () => {
      const tests = [
        { nickname: "My Account" },
        { productName: "Premium Checking" },
        { product: "Savings" },
        { description: "Main Account" },
        { accountDescription: "Secondary Account" }
      ];
      
      tests.forEach((item) => {
        const result = mapAccount(item, 0);
        assert.ok(result.name.length > 0);
      });
    });

    it("infers checking type from draft keyword", () => {
      const result = mapAccount({ type: "draft account" }, 0);
      assert.equal(result.type, "checking");
    });

    it("infers savings type from share keyword", () => {
      const result = mapAccount({ type: "share account" }, 0);
      assert.equal(result.type, "savings");
    });

    it("infers savings type from sav keyword", () => {
      const result = mapAccount({ type: "savings account" }, 0);
      assert.equal(result.type, "savings");
    });

    it("infers credit type from loan keyword", () => {
      const result = mapAccount({ type: "loan account" }, 0);
      assert.equal(result.type, "credit");
    });

    it("infers credit type from credit keyword", () => {
      const result = mapAccount({ type: "credit card" }, 0);
      assert.equal(result.type, "credit");
    });

    it("defaults to checking type", () => {
      const result = mapAccount({}, 0);
      assert.equal(result.type, "checking");
    });

    it("picks balance from alternative fields", () => {
      const tests = [
        { availableBalance: 100 },
        { currentBalance: 200 },
        { ledgerBalance: 300 }
      ];
      
      tests.forEach((item) => {
        const result = mapAccount(item, 0);
        assert.ok(typeof result.balance === "number");
      });
    });

    it("defaults balance to 0 when not found", () => {
      const result = mapAccount({ name: "Test" }, 0);
      assert.equal(result.balance, 0);
    });

    it("defaults currency to USD", () => {
      const result = mapAccount({ name: "Test" }, 0);
      assert.equal(result.currency, "USD");
    });
  });

  describe("mapMembers1stAccountDetails", () => {
    it("maps account with products array", () => {
      const details = {
        accountKey: "key_123",
        nickname: "Main Account",
        products: [
          {
            id: "p1",
            description: { full: "Checking" },
            availableBalance: 500
          },
          {
            id: "p2",
            description: { full: "Savings" },
            availableBalance: 1000
          }
        ]
      };
      
      const result = mapMembers1stAccountDetails(details, 0);
      
      assert.equal(result.length, 2);
      assert.equal(result[0].id, "key_123:p1");
      assert.equal(result[0].name, "Main Account - Checking");
      assert.equal(result[0].balance, 500);
      assert.equal(result[1].id, "key_123:p2");
      assert.equal(result[1].name, "Main Account - Savings");
      assert.equal(result[1].balance, 1000);
    });

    it("includes members1st metadata", () => {
      const details = {
        accountKey: "key_123",
        products: [
          {
            id: "p1",
            code: "CHK",
            description: { full: "Checking" },
            availableBalance: 500
          }
        ]
      };
      
      const result = mapMembers1stAccountDetails(details, 0);
      
      assert.equal(result.length, 1);
      assert.ok(result[0].members1st);
      assert.equal(result[0].members1st.accountKey, "key_123");
      assert.equal(result[0].members1st.productId, "p1");
      assert.equal(result[0].members1st.productCode, "CHK");
    });

    it("falls back to legacy mapping when no products", () => {
      const details = {
        id: "acct_123",
        name: "Account Name",
        balance: 750
      };
      
      const result = mapMembers1stAccountDetails(details, 0);
      
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "acct_123");
      assert.equal(result[0].name, "Account Name");
      assert.equal(result[0].balance, 750);
    });

    it("handles empty products array with fallback", () => {
      const details = {
        accountKey: "key_123",
        nickname: "Empty Products",
        products: []
      };
      
      const result = mapMembers1stAccountDetails(details, 0);
      
      assert.equal(result.length, 1);
      // Falls back to legacy mapping
    });

    it("generates account key from index when missing", () => {
      const details = {
        products: [
          {
            id: "p1",
            description: { full: "Product" },
            availableBalance: 100
          }
        ]
      };
      
      const result = mapMembers1stAccountDetails(details, 5);
      
      assert.ok(result[0].id.startsWith("acct_006:"));
    });

    it("infers type from product fields", () => {
      const details = {
        accountKey: "key_123",
        products: [
          {
            id: "p1",
            code: "SHARE",
            description: { full: "Savings" },
            availableBalance: 100
          }
        ]
      };
      
      const result = mapMembers1stAccountDetails(details, 0);
      
      assert.equal(result[0].type, "savings");
    });

    it("uses product description.full when available, falls back to nickname", () => {
      const details = {
        accountKey: "key_123",
        products: [
          {
            id: "p1",
            nickname: "My Nickname",
            description: { full: "Full Description" },
            availableBalance: 100
          }
        ]
      };
      
      const result = mapMembers1stAccountDetails(details, 0);
      
      // description.full takes precedence over nickname
      assert.ok(result[0].name.includes("Full Description"));
    });

    it("uses product nickname when description.full is not available", () => {
      const details = {
        accountKey: "key_123",
        products: [
          {
            id: "p1",
            nickname: "My Nickname",
            availableBalance: 100
          }
        ]
      };
      
      const result = mapMembers1stAccountDetails(details, 0);
      
      assert.ok(result[0].name.includes("My Nickname"));
    });
  });
});
