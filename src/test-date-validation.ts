import "./env.js";

import { createServer } from "node:http";

import { fetchMembers1stAccounts, fetchMembers1stTransactions } from "./members1st/index.js";

/**
 * Test that verifies date validation works correctly.
 */
async function main() {
  const accountKey = "test-account-key";
  const productId = "P001";
  const productCode = "Draft";

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/api/v1/account") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify([
          {
            accountKey,
            nickname: "Test Account",
            products: [
              {
                id: productId,
                code: productCode,
                description: { full: "Test Product" },
                balance: 1000.0,
                availableBalance: 900.0
              }
            ]
          }
        ])
      );
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unexpected server address");

  const origin = `http://127.0.0.1:${address.port}`;

  process.env.MEMBERS1ST_ACCOUNTS_URL = `${origin}/api/v1/account`;
  process.env.MEMBERS1ST_TRANSACTIONS_URL_BASE = `${origin}/api/v1/Transactions`;
  process.env.MEMBERS1ST_ORIGIN = origin;
  process.env.MEMBERS1ST_COOKIE = "abc123";
  process.env.MEMBERS1ST_DISABLE_CACHE = "1";
  process.env.LOG_API_REQUESTS = "false";

  const accounts = await fetchMembers1stAccounts();
  const acctId = accounts[0]?.id;
  if (!acctId) throw new Error("No accounts returned");

  console.log("Test 1: Invalid date range (start > end)");
  try {
    await fetchMembers1stTransactions(acctId, {
      startDate: "2025-12-13",
      endDate: "2025-11-13"
    });
    console.error("  FAILED: Should have thrown for invalid date range");
    server.close();
    process.exit(1);
  } catch (err) {
    if (err instanceof Error && err.message.includes("startDate must be before or equal to endDate")) {
      console.log("  PASSED: Correctly rejected start > end\n");
    } else {
      console.error("  FAILED: Wrong error -", err);
      server.close();
      process.exit(1);
    }
  }

  console.log("Test 2: Invalid date format");
  try {
    await fetchMembers1stTransactions(acctId, {
      startDate: "not-a-date",
      endDate: "2025-12-13"
    });
    console.error("  FAILED: Should have thrown for invalid date format");
    server.close();
    process.exit(1);
  } catch (err) {
    if (err instanceof Error && err.message.includes("invalid date format")) {
      console.log("  PASSED: Correctly rejected invalid date format\n");
    } else {
      console.error("  FAILED: Wrong error -", err);
      server.close();
      process.exit(1);
    }
  }

  console.log("Test 3: Valid date range (equal dates)");
  try {
    // This should work (equal dates are valid)
    // But will fail because we don't mock the transactions endpoint
    // We just want to verify it passes date validation
    await fetchMembers1stTransactions(acctId, {
      startDate: "2025-12-13",
      endDate: "2025-12-13"
    });
    console.error("  FAILED: Expected transaction fetch to fail (no mock endpoint)");
    server.close();
    process.exit(1);
  } catch (err) {
    // Should fail with API error, not date validation error
    if (err instanceof Error && (err.message.includes("404") || err.message.includes("failed"))) {
      console.log("  PASSED: Date validation passed, API error expected\n");
    } else {
      console.error("  FAILED: Wrong error -", err);
      server.close();
      process.exit(1);
    }
  }

  server.close();
  console.log("All date validation tests passed!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
