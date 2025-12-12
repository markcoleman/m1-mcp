# m1-mcp

A minimal Node.js MCP server that exposes three tools:

- `get_all_accounts`
- `get_account_details` (by `accountId`)
- `get_account_transactions` (by `accountId`)

The server uses an in-memory mock dataset in `src/data.ts`.

## Prereqs

- Node.js 18+ recommended

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Run the MCP server (stdio)

```bash
npm start
```

This starts an MCP server over stdio (for use by an MCP client).

## Run the MCP server (HTTP)

This repo also supports exposing the MCP server over HTTP using the MCP **Streamable HTTP** transport.

### Quick start

Dev (TypeScript via tsx):

```bash
npm run dev:http
```

Prod (compiled JS):

```bash
npm run build
npm run start:http
```

By default it binds to `127.0.0.1:3000` and serves MCP at `GET/POST /mcp`.

### Configuration (env vars)

- `MCP_TRANSPORT`: `stdio` (default) or `http`
- `HOST`: bind address (default `127.0.0.1`)
- `PORT`: listen port (default `3000`)
- `MCP_PATH`: MCP endpoint path (default `/mcp`)
- `MCP_ENABLE_JSON_RESPONSE`: set to `true`/`1` to prefer JSON responses instead of starting an SSE stream
- `MCP_STATELESS`: set to `true`/`1` to disable MCP session ids (stateless mode)

Example (custom host/port/path):

```bash
MCP_TRANSPORT=http HOST=0.0.0.0 PORT=8787 MCP_PATH=/mcp node dist/server.js
```

## Quick local verification (no MCP client)

```bash
npm run build
npm test
```

## Example MCP client config

If your client supports configuring MCP servers via a command:

- Command: `node`
- Args: `dist/server.js`
- Working directory: this repo root

Example (pseudo-config):

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

## Tool I/O

### `get_all_accounts`

Input: `{}`

Output:

```json
{ "accounts": [ { "id": "acct_001", "name": "Everyday Checking" } ] }
```

### `get_account_details`

Input:

```json
{ "accountId": "acct_001" }
```

### `get_account_transactions`

Input:

```json
{ "accountId": "acct_001" }
```
