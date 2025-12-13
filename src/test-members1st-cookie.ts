import "./env.js";

import { createServer } from "node:http";
import { fetchMembers1stAccounts } from "./members1st/index.js";

async function main() {
  const expectedCookieHeader = "M1Online=abc123";

  let seenCookie: string | undefined;

  const server = createServer((req, res) => {
    seenCookie = req.headers.cookie;

    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");

    // Return a shape that fetchMembers1stAccounts can parse.
    res.end(
      JSON.stringify({
        accounts: [
          {
            id: "acct_test",
            name: "Test Account",
            type: "checking",
            currency: "USD",
            balance: 1
          }
        ]
      })
    );
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unexpected server address");

  const url = `http://127.0.0.1:${address.port}/api/v1/account`;

  process.env.MEMBERS1ST_ACCOUNTS_URL = url;
  // Provide a bare value; implementation should wrap as M1Online=<value>
  process.env.MEMBERS1ST_COOKIE = "abc123";
  process.env.MEMBERS1ST_DISABLE_CACHE = "1";

  const accounts = await fetchMembers1stAccounts();

  server.close();

  console.log("Fetched accounts =>", JSON.stringify(accounts, null, 2));
  console.log("Server saw Cookie =>", JSON.stringify(seenCookie));

  if (seenCookie !== expectedCookieHeader) {
    console.error("Cookie header mismatch");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
