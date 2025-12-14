import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fetchMembers1stAccounts, clearAccountsCache } from "./client.js";

describe("client 401 retry with cookie file", () => {
  const originalEnv = process.env;
  const testDir = join("/tmp", "m1-mcp-test-401-retry");
  const cookieFile = join(testDir, "test.cookie");
  let server: Server | undefined;
  let requestCount: number;
  let requestCookies: string[];

  beforeEach(async () => {
    // Reset environment
    process.env = { ...originalEnv };
    requestCount = 0;
    requestCookies = [];

    // Create test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
    mkdirSync(testDir, { recursive: true });

    // Write initial cookie (will be updated in the test)
    writeFileSync(cookieFile, "initialcookie");
    process.env.MEMBERS1ST_COOKIE_FILE = cookieFile;
    process.env.MEMBERS1ST_DISABLE_CACHE = "1";

    // Create test server
    server = createServer((req, res) => {
      requestCount++;
      requestCookies.push(req.headers.cookie || "");

      // Simulate 401 on first request, then update cookie file and succeed on retry
      if (requestCount === 1) {
        // First request: return 401 and update the cookie file
        // This simulates the user updating the cookie file after seeing a 401 error
        writeFileSync(cookieFile, "updatedcookie");
        res.statusCode = 401;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "Unauthorized" }));
      } else {
        // Subsequent requests: succeed if cookie was updated
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            accounts: [
              {
                accountKey: "test123",
                productId: "prod456",
                productCode: "Draft",
                name: "Test Account",
                balance: 1000,
                availableBalance: 1000,
                productType: "Checking"
              }
            ]
          })
        );
      }
    });

    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server!.address();
    if (!address || typeof address === "string") throw new Error("Unexpected server address");
    process.env.MEMBERS1ST_ACCOUNTS_URL = `http://127.0.0.1:${address.port}/api/v1/account`;
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      server = undefined;
    }

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }

    // Restore environment
    process.env = originalEnv;
  });

  it("reloads cookie from file on 401 and retries successfully", async () => {
    // The server will return 401 on first request and update the cookie file
    // This simulates the scenario where:
    // 1. Request is made with initial cookie
    // 2. Server returns 401
    // 3. User updates the cookie file (server simulates this)
    // 4. Retry reads the new cookie from file
    
    const accounts = await fetchMembers1stAccounts();

    // Should have made 2 requests
    assert.equal(requestCount, 2);
    // First request had initial cookie
    assert.equal(requestCookies[0], "M1Online=initialcookie");
    // Second request should have updated cookie (read from file during retry)
    assert.equal(requestCookies[1], "M1Online=updatedcookie");
    // Should have successfully fetched accounts
    assert.ok(Array.isArray(accounts));
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].name, "Test Account");
  });

  it("clears cache when 401 is detected", async () => {
    // Simulate a cached response
    // First, make a successful request (with correct cookie from start)
    writeFileSync(cookieFile, "goodcookie789");
    
    // Create a server that always succeeds
    const goodServer = createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          accounts: [
            {
              accountKey: "cached123",
              productId: "prod789",
              productCode: "Draft",
              name: "Cached Account",
              balance: 2000,
              availableBalance: 2000,
              productType: "Checking"
            }
          ]
        })
      );
    });

    await new Promise<void>((resolve) => goodServer.listen(0, "127.0.0.1", resolve));
    const address = goodServer.address();
    if (!address || typeof address === "string") throw new Error("Unexpected server address");
    process.env.MEMBERS1ST_ACCOUNTS_URL = `http://127.0.0.1:${address.port}/api/v1/account`;
    process.env.MEMBERS1ST_DISABLE_CACHE = "0"; // Enable cache
    process.env.MEMBERS1ST_CACHE_TTL_MS = "10000"; // 10 second cache

    try {
      // Fetch accounts (will be cached)
      const accounts1 = await fetchMembers1stAccounts();
      assert.equal(accounts1[0].name, "Cached Account");

      // Clear cache (simulating 401 detection)
      clearAccountsCache();

      // Fetch again - should make a new request, not use cache
      const accounts2 = await fetchMembers1stAccounts();
      assert.equal(accounts2[0].name, "Cached Account");
    } finally {
      await new Promise<void>((resolve, reject) => {
        goodServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  });
});
