#!/bin/bash
# Example: Testing the MCP HTTP server with curl
# Start the server first with: npm run dev:http

# Get list of tools
echo "=== List Tools ==="
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

echo -e "\n\n=== Get All Accounts ==="
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_all_accounts",
      "arguments": {}
    }
  }'

echo -e "\n\n=== Get Account Details ==="
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_account_details",
      "arguments": {
        "accountId": "acct_001"
      }
    }
  }'

echo -e "\n\n=== Get Account Transactions ==="
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_account_transactions",
      "arguments": {
        "accountId": "acct_001",
        "days": 30
      }
    }
  }'

echo -e "\n"
