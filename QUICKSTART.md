# Quick Start Guide

Get started with m1-mcp in 5 minutes!

## 1. Install Dependencies

```bash
npm install
```

## 2. Build the Project

```bash
npm run build
```

## 3. Test with Mock Data

```bash
npm test
```

You should see output showing accounts and transactions from the mock dataset.

## 4. Try the CLI Tool

```bash
npm run get:account -- acct_001
```

This will fetch details for account `acct_001`.

## 5. Use with an MCP Client

### Option A: Claude Desktop

1. Build the project: `npm run build`
2. Copy the example config:
   ```bash
   # On macOS
   mkdir -p ~/Library/Application\ Support/Claude
   ```
3. Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
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
4. Replace `/absolute/path/to/m1-mcp` with your actual path
5. Restart Claude Desktop

### Option B: Test via HTTP

1. Start the HTTP server:
   ```bash
   npm run dev:http
   ```

2. In another terminal, test with curl:
   ```bash
   curl -X POST http://127.0.0.1:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "get_all_accounts",
         "arguments": {}
       }
     }'
   ```

## Available Tools

Once connected via an MCP client, you'll have access to:

- **get_all_accounts**: List all accounts
- **get_account_details**: Get details for a specific account
- **get_account_transactions**: Get transactions for an account (with optional filters)

## Next Steps

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Check [examples/](examples/) for more configuration examples
- See [README.md](README.md) for full documentation

## Troubleshooting

**Build fails?**
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**MCP client can't connect?**
- Verify the build succeeded: check that `dist/` directory exists
- Ensure the path in your config is absolute (not relative)
- Check Node.js is in your PATH: `which node`

**Need help?**
- Open an issue on GitHub
- Check existing issues for solutions
