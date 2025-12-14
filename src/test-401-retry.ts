import "./env.js";

import { createServer } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fetchMembers1stAccounts } from "./members1st/index.js";

async function main() {
  console.log("\n=== Testing 401 Cookie Reload Functionality ===\n");

  // Create a temporary directory for the cookie file
  const testDir = "/tmp/m1-mcp-401-test";
  mkdirSync(testDir, { recursive: true });
  const cookieFile = join(testDir, ".cookie");

  // Write initial (invalid) cookie
  writeFileSync(cookieFile, "expired-cookie-123");
  console.log("✓ Created cookie file with expired cookie:", cookieFile);

  let requestCount = 0;
  const requests: Array<{ cookie: string; time: Date }> = [];

  const server = createServer((req, res) => {
    requestCount++;
    const cookie = req.headers.cookie || "(none)";
    requests.push({ cookie, time: new Date() });
    
    console.log(`\nRequest #${requestCount}:`);
    console.log(`  Cookie: ${cookie}`);

    // First request: return 401 (expired cookie)
    // After 401, user should update the cookie file
    // Retry should succeed with new cookie
    if (requestCount === 1) {
      console.log(`  Response: 401 Unauthorized (cookie expired)`);
      console.log(`\n  → Simulating user updating cookie file...`);
      
      // Simulate user updating the cookie file after seeing 401 error
      setTimeout(() => {
        writeFileSync(cookieFile, "fresh-cookie-456");
        console.log(`  ✓ Cookie file updated with fresh cookie`);
      }, 50);

      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "Session expired" }));
    } else if (cookie.includes("fresh-cookie-456")) {
      console.log(`  Response: 200 OK (cookie accepted)`);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          accounts: [
            {
              accountKey: "test123",
              productId: "prod456",
              productCode: "Draft",
              name: "Test Checking Account",
              balance: 1234.56,
              availableBalance: 1234.56,
              productType: "Checking"
            }
          ]
        })
      );
    } else {
      console.log(`  Response: 401 Unauthorized (invalid cookie)`);
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "Invalid session" }));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unexpected server address");

  const url = `http://127.0.0.1:${address.port}/api/v1/account`;

  process.env.MEMBERS1ST_ACCOUNTS_URL = url;
  process.env.MEMBERS1ST_COOKIE_FILE = cookieFile;
  process.env.MEMBERS1ST_DISABLE_CACHE = "1";

  console.log("\n✓ Test server started at:", url);
  console.log("\n--- Starting account fetch (will get 401 and retry) ---");

  try {
    // Give the server a moment to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const accounts = await fetchMembers1stAccounts();

    console.log("\n--- Fetch completed successfully ---");
    console.log(`\n✓ Fetched ${accounts.length} account(s):`);
    accounts.forEach(acc => {
      console.log(`  - ${acc.name}: ${acc.currency} ${acc.balance}`);
    });

    console.log(`\n✓ Total requests made: ${requestCount}`);
    console.log(`  Request 1: ${requests[0].cookie} → 401`);
    console.log(`  Request 2: ${requests[1].cookie} → 200`);

    if (requestCount === 2 && 
        requests[0].cookie.includes("expired-cookie-123") &&
        requests[1].cookie.includes("fresh-cookie-456")) {
      console.log("\n✅ TEST PASSED: 401 retry with cookie reload works correctly!");
    } else {
      console.log("\n❌ TEST FAILED: Unexpected behavior");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
