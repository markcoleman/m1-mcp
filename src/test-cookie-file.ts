import "./env.js";

import { createServer } from "node:http";
import { writeFileSync, unlinkSync } from "node:fs";
import { fetchMembers1stAccounts } from "./members1st/index.js";

async function main() {
  const cookieValue = "test-cookie-from-file-xyz";
  const cookieFilePath = "/tmp/test-m1-cookie-file";
  const expectedCookieHeader = `M1Online=${cookieValue}`;

  // Write cookie to file
  writeFileSync(cookieFilePath, cookieValue);

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

  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Unexpected server address");

    const url = `http://127.0.0.1:${address.port}/api/v1/account`;

    process.env.MEMBERS1ST_ACCOUNTS_URL = url;
    // Use cookie file instead of direct value
    process.env.MEMBERS1ST_COOKIE_FILE = cookieFilePath;
    delete process.env.MEMBERS1ST_COOKIE;
    process.env.MEMBERS1ST_DISABLE_CACHE = "1";

    const accounts = await fetchMembers1stAccounts();

    console.log("Fetched accounts =>", JSON.stringify(accounts, null, 2));
    console.log("Server saw Cookie =>", JSON.stringify(seenCookie));

    if (seenCookie !== expectedCookieHeader) {
      console.error(`Cookie header mismatch. Expected: ${expectedCookieHeader}, Got: ${seenCookie}`);
      process.exit(1);
    }

    console.log("✓ Cookie file test passed!");
  } finally {
    // Always clean up server and test file
    server.close();
    try {
      unlinkSync(cookieFilePath);
    } catch {
      // Ignore errors during cleanup
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
