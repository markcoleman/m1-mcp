import "./env.js";

import { createServer } from "node:http";

import { fetchMembers1stAccounts, fetchMembers1stTransactions } from "./members1st/index.js";

async function main() {
  const expectedCookieHeader = "M1Online=abc123";
  const accountKey = "0a02653b1e344b73bab479c6b37d9649";
  const productId = "S0011";
  const productCode = "Draft";

  let seenCookie: string | undefined;
  let seenPath: string | undefined;
  let seenQuery: Record<string, string> = {};
  let seenReferer: string | undefined;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/api/v1/account") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify([
          {
            accountKey,
            nickname: "Our Cash",
            products: [
              {
                id: productId,
                code: productCode,
                description: { full: "Money" },
                balance: 123.45,
                availableBalance: 120.0
              }
            ]
          }
        ])
      );
      return;
    }

    if (req.method === "GET" && url.pathname === `/api/v1/Transactions/${accountKey}/${productId}`) {
      seenCookie = req.headers.cookie;
      seenPath = url.pathname;
      seenReferer = typeof req.headers.referer === "string" ? req.headers.referer : undefined;

      for (const [k, v] of url.searchParams.entries()) {
        seenQuery[k] = v;
      }

      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          transactions: [
            {
              transactionId: "t1",
              postDate: "2025-12-11T00:00:00",
              description: "Test Txn",
              amount: -1.23,
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

  const txns = await fetchMembers1stTransactions(acctId, {
    startDate: "2025-11-13",
    endDate: "2025-12-13"
  });

  server.close();

  const expectedReferer = `${origin}/mega/product-details/transactions?id=${encodeURIComponent(productId)}&type=${encodeURIComponent(productCode)}`;

  console.log("Fetched transactions =>", JSON.stringify(txns, null, 2));
  console.log("Server saw Cookie =>", JSON.stringify(seenCookie));
  console.log("Server saw Path =>", JSON.stringify(seenPath));
  console.log("Server saw Query =>", JSON.stringify(seenQuery, null, 2));
  console.log("Server saw Referer =>", JSON.stringify(seenReferer));

  if (seenCookie !== expectedCookieHeader) {
    console.error("Cookie header mismatch");
    process.exit(1);
  }

  if (seenPath !== `/api/v1/Transactions/${accountKey}/${productId}`) {
    console.error("Path mismatch");
    process.exit(1);
  }

  const expectedQuery: Record<string, string> = {
    billpayOnly: "false",
    days: "30",  // Calculated internally from date range (2025-11-13 to 2025-12-13)
    startDate: "2025-11-13",
    endDate: "2025-12-13",
    advanced: "true",
    actionCode: "*",
    sourceCode: "*"
  };

  for (const [k, v] of Object.entries(expectedQuery)) {
    if (seenQuery[k] !== v) {
      console.error(`Query mismatch for ${k}: expected ${v} got ${seenQuery[k]}`);
      process.exit(1);
    }
  }

  if (seenReferer !== expectedReferer) {
    console.error("Referer header mismatch");
    process.exit(1);
  }

  if (txns.length !== 1 || txns[0]?.id !== "t1" || txns[0]?.accountId !== acctId) {
    console.error("Returned transactions mapping mismatch");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
