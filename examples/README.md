# Examples

This directory contains example configurations and usage scripts for m1-mcp.

## MCP Client Configurations

### Claude Desktop

File: `claude-desktop-config.json`

Add this to your Claude Desktop MCP configuration file (typically located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "m1-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/m1-mcp/dist/server.js"],
      "env": {
        "DATA_SOURCE": "mock"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/m1-mcp` with the actual path to your m1-mcp installation.

### Cline

File: `cline-mcp-settings.json`

Add this to your Cline MCP settings:

```json
{
  "mcpServers": {
    "m1-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/m1-mcp/dist/server.js"]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/m1-mcp` with the actual path to your m1-mcp installation.

## HTTP Server Examples

### Testing with curl

File: `http-client-example.sh`

This script demonstrates how to interact with the MCP server over HTTP.

First, start the server in HTTP mode:

```bash
npm run dev:http
```

Then run the example script:

```bash
bash examples/http-client-example.sh
```

Or make individual requests:

```bash
# List available tools
curl -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Call get_all_accounts
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
```

## Environment Configuration Examples

### Mock Data (Default)

Create a `.env` file for local development with mock data:

```bash
# Use mock data (default)
DATA_SOURCE=mock
```

### Members1st Integration

For Members1st integration, you have two options for providing the authentication cookie:

#### Option 1: Cookie in .env file (simple)

```bash
# Use Members1st API
DATA_SOURCE=members1st

# Members1st credentials (required)
MEMBERS1ST_COOKIE=your_cookie_value_here

# Optional: Additional headers (JSON format)
# MEMBERS1ST_HEADERS_JSON={"NCSRF":"your_value","X-Akamai-Client-Type":"Web"}
```

#### Option 2: Cookie in separate file (recommended)

Create a file named `.members1st-cookie` containing just the cookie value:

```bash
echo "your_cookie_value_here" > .members1st-cookie
```

Then configure your `.env` file:

```bash
# Use Members1st API
DATA_SOURCE=members1st

# Read cookie from file (more secure and convenient)
MEMBERS1ST_COOKIE_FILE=.members1st-cookie

# Optional: Additional headers (JSON format)
# MEMBERS1ST_HEADERS_JSON={"NCSRF":"your_value","X-Akamai-Client-Type":"Web"}
```

#### Additional Configuration

```bash
# Optional: Custom endpoints
# MEMBERS1ST_ACCOUNTS_URL=https://myonline.members1st.org/api/v1/account
# MEMBERS1ST_TRANSACTIONS_URL_BASE=https://myonline.members1st.org/api/v1/Transactions
# MEMBERS1ST_ORIGIN=https://myonline.members1st.org

# Optional: Cache configuration
# MEMBERS1ST_CACHE_TTL_MS=30000
# MEMBERS1ST_DISABLE_CACHE=false
```

**Security Note**: Never commit your `.env` file or `.members1st-cookie` file with real credentials. Both are gitignored for this reason.

## Direct Tool Testing

Test individual tools without an MCP client:

```bash
# Test get_account_details
npm run get:account -- acct_001

# Test with Members1st data source
DATA_SOURCE=members1st npm run get:account -- acct_001

# Run full test harness
npm test
```

## Custom HTTP Server Configuration

Run the server with custom HTTP settings:

```bash
# Custom host and port
HOST=0.0.0.0 PORT=8080 MCP_PATH=/api/mcp npm run dev:http

# Enable JSON responses instead of SSE
MCP_ENABLE_JSON_RESPONSE=true npm run dev:http

# Stateless mode (no session IDs)
MCP_STATELESS=true npm run dev:http
```

## Production Deployment Example

```bash
# 1. Build the project
npm run build

# 2. Set environment variables
export DATA_SOURCE=members1st
export MEMBERS1ST_COOKIE=your_production_cookie
export MCP_TRANSPORT=http
export HOST=0.0.0.0
export PORT=3000

# 3. Start the server
npm start

# Or for HTTP mode:
npm run start:http
```

## Troubleshooting

### Server not responding

1. Check that the server is running: `ps aux | grep node`
2. Verify the port is not in use: `lsof -i :3000`
3. Check server logs for errors

### MCP client can't connect

1. Ensure you've built the project: `npm run build`
2. Verify the path in your client config is absolute
3. Check that Node.js is in your PATH
4. Try running the server manually first: `npm start`

### Members1st authentication fails

1. Verify your cookie is current and valid
2. Check that required headers are included (NCSRF, etc.)
3. Test the connection: `npm run test:members1st-cookie`
4. Review Members1st API documentation for changes
