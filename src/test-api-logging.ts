import "./env.js";
import { createServer } from "node:http";
import { fetchMembers1stAccounts } from "./members1st.js";

/**
 * Simple test script to demonstrate API request logging.
 * This creates a local mock server and makes a request to it to show the logging output.
 */

async function main() {
  console.log("\n=== Testing API Request Logging ===\n");
  console.log("Starting mock Members1st server on port 9999...\n");

  // Create a simple mock server
  const mockServer = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        accounts: [
          {
            accountKey: "test_key_001",
            maskedAccountNumber: "****1234",
            products: [
              {
                id: "prod_001",
                description: {
                  full: "Primary Checking"
                },
                availableBalance: 1500.50,
                code: "Draft"
              }
            ]
          }
        ]
      })
    );
  });

  await new Promise<void>((resolve) => {
    mockServer.listen(9999, "127.0.0.1", resolve);
  });

  try {
    // Set environment to use our mock server
    process.env.MEMBERS1ST_ACCOUNTS_URL = "http://127.0.0.1:9999/api/v1/account?test=true&userId=12345";
    process.env.DATA_SOURCE = "members1st";
    process.env.LOG_API_REQUESTS = "true";
    
    console.log("Test 1: API request logging enabled (default in non-production)");
    console.log("Making request to Members1st API...\n");
    
    const accounts = await fetchMembers1stAccounts();
    console.log(`\n✓ Successfully fetched ${accounts.length} account(s)\n`);

    console.log("\nTest 2: With response logging enabled");
    process.env.LOG_API_RESPONSES = "true";
    process.env.LOG_API_REQUESTS = "true";
    // Disable cache to force a new request
    process.env.MEMBERS1ST_DISABLE_CACHE = "true";
    console.log("Making another request with response logging...\n");
    
    const accounts2 = await fetchMembers1stAccounts();
    console.log(`\n✓ Successfully fetched ${accounts2.length} account(s) with response logging\n`);

    console.log("\nTest 3: Logging disabled (production mode)");
    process.env.NODE_ENV = "production";
    process.env.LOG_API_REQUESTS = "";
    console.log("Making request in production mode (no logging expected)...\n");
    
    const accounts3 = await fetchMembers1stAccounts();
    console.log(`\n✓ Successfully fetched ${accounts3.length} account(s) - no API logs should appear above\n`);

  } finally {
    mockServer.close();
    console.log("Mock server stopped\n");
    console.log("=== API Request Logging Test Complete ===\n");
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
