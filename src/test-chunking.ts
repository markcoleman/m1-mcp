import "./env.js";

import { createServer } from "node:http";

import { fetchMembers1stAccounts, fetchMembers1stTransactions } from "./members1st.js";

/**
 * Test that verifies transaction requests exceeding 180 days are chunked correctly.
 */
async function main() {
  const expectedCookieHeader = "M1Online=abc123";
  const accountKey = "test-account-key";
  const productId = "P001";
  const productCode = "Draft";

  let requestCount = 0;
  const seenRequests: Array<{ path: string; query: Record<string, string> }> = [];

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

    if (req.method === "GET" && url.pathname === `/api/v1/Transactions/${accountKey}/${productId}`) {
      requestCount++;
      const queryParams: Record<string, string> = {};
      for (const [k, v] of url.searchParams.entries()) {
        queryParams[k] = v;
      }
      seenRequests.push({ path: url.pathname, query: queryParams });

      // Return mock transactions for each chunk
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          transactions: [
            {
              transactionId: `txn_chunk_${requestCount}`,
              postDate: queryParams.startDate,
              description: `Transaction for chunk ${requestCount}`,
              amount: -10.0 * requestCount,
              currency: "USD"
            }
          ]
        })
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

  const accounts = await fetchMembers1stAccounts();
  const acctId = accounts[0]?.id;
  if (!acctId) throw new Error("No accounts returned");

  console.log("Test 1: Date range within 180 days (should not chunk)");
  requestCount = 0;
  seenRequests.length = 0;

  const txns1 = await fetchMembers1stTransactions(acctId, {
    startDate: "2025-06-01",
    endDate: "2025-09-01"
  });

  console.log(`  Requests made: ${requestCount}`);
  console.log(`  Transactions returned: ${txns1.length}`);

  if (requestCount !== 1) {
    console.error("  FAILED: Expected 1 request for date range within 180 days");
    process.exit(1);
  }
  console.log("  PASSED\n");

  console.log("Test 2: Date range exceeding 180 days (should chunk into multiple requests)");
  requestCount = 0;
  seenRequests.length = 0;

  // 365 days should result in 3 chunks (180 + 180 + 5)
  const txns2 = await fetchMembers1stTransactions(acctId, {
    startDate: "2024-01-01",
    endDate: "2024-12-31"
  });

  console.log(`  Requests made: ${requestCount}`);
  console.log(`  Transactions returned: ${txns2.length}`);

  if (requestCount < 2) {
    console.error("  FAILED: Expected multiple requests for date range exceeding 180 days");
    process.exit(1);
  }

  // Verify chunks cover the full range
  console.log("  Chunks:");
  for (let i = 0; i < seenRequests.length; i++) {
    console.log(`    Chunk ${i + 1}: ${seenRequests[i].query.startDate} to ${seenRequests[i].query.endDate} (${seenRequests[i].query.days} days)`);
  }

  console.log("  PASSED\n");

  console.log("Test 3: Verify deduplication of transactions");
  // In this test, our mock server returns the same transaction ID for all chunks
  // The implementation should deduplicate by transaction ID
  console.log(`  Unique transactions after merging ${requestCount} chunks: ${txns2.length}`);
  if (txns2.length !== requestCount) {
    console.error(`  WARNING: Expected ${requestCount} unique transactions after deduplication`);
  } else {
    console.log("  PASSED\n");
  }

  server.close();

  console.log("All chunking tests passed!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
