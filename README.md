# m1-mcp

Minimal Node.js (TypeScript) MCP server that exposes three tools for account data.

By default it serves a small in-memory mock dataset. You can optionally switch to a "Members 1st" HTTP-backed data source via environment variables.

## Table of Contents

- [Architecture](#architecture)
- [Tools](#tools)
- [Prerequisites](#prereqs)
- [Installation](#install)
- [Configuration](#environment-env)
- [Usage](#scripts)
- [Running](#run-stdio)
- [Testing](#quick-local-verification-no-mcp-client)
- [Client Configuration](#example-mcp-client-config)
- [Tool Examples](#tool-io-examples)
- [Data Sources](#data-sources)
- [Contributing](#contributing)

## Architecture

This project implements an MCP (Model Context Protocol) server that provides financial account data through a clean abstraction layer:

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Client                           │
│              (Claude, Cline, etc.)                      │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol
                     │ (stdio or HTTP)
┌────────────────────▼────────────────────────────────────┐
│                  server.ts                              │
│         (MCP Server Implementation)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Tool Request Handler                            │   │
│  │  - ListToolsRequest                              │   │
│  │  - CallToolRequest                               │   │
│  └────────────────┬─────────────────────────────────┘   │
└───────────────────┼─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                  tools.ts                               │
│            (Tool Handlers & Schemas)                    │
│  - handleGetAllAccounts()                               │
│  - handleGetAccountDetails(accountId)                   │
│  - handleGetAccountTransactions(accountId, opts)        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  data.ts                                │
│           (Data Abstraction Layer)                      │
│  - getAllAccounts()                                     │
│  - getAccountById(id)                                   │
│  - getTransactionsForAccount(id, opts)                  │
└───────┬───────────────────────────┬────────────────────┘
        │                           │
        │ DATA_SOURCE=mock          │ DATA_SOURCE=members1st
        ▼                           ▼
┌───────────────────┐    ┌──────────────────────────────┐
│  Mock Data        │    │     members1st.ts            │
│  (in-memory)      │    │  (HTTP API Integration)      │
│                   │    │  - fetchMembers1stAccounts() │
│  - 3 accounts     │    │  - fetchMembers1stTransactions()
│  - 5 transactions │    │  - HTTP client with caching  │
└───────────────────┘    └──────────────────────────────┘
```

### Key Components

- **server.ts**: Core MCP server with stdio and HTTP transports
- **tools.ts**: MCP tool definitions and request handlers
- **data.ts**: Data layer abstraction supporting multiple backends
- **members1st.ts**: Members1st API client with authentication and caching
- **env.ts**: Environment variable loader using dotenv

### Data Flow

1. MCP client sends tool request (e.g., `get_all_accounts`)
2. Server validates and routes to appropriate handler
3. Handler calls data layer function
4. Data layer checks `DATA_SOURCE` and routes to mock or Members1st
5. Response flows back through layers to client as JSON

## Tools

- `get_all_accounts` → returns `{ accounts: Account[] }`
- `get_account_details` → input `{ accountId: string }`, returns `{ account }` or `{ error }`
- `get_account_transactions` → input:
  - required: `accountId: string`
  - optional filters: `startDate`, `endDate` (YYYY-MM-DD), `days` (1–180), `billpayOnly`, `advanced`, `actionCode`, `sourceCode`
  - limits: max 180 days per request; no paging

Note: tool results are returned as JSON encoded into MCP `text` content.

## Prereqs

- Node.js 18+ (Node 20+ recommended)

## Install

```bash
npm install
```

## Environment (.env)

This repo auto-loads a local `.env` file via `dotenv` (see `src/env.ts`).

- Copy `.env.example` to `.env` and fill in values.
- Do not commit `.env` (it is gitignored).

## Scripts

- `npm run dev` – run MCP server over stdio (TypeScript via `tsx`)
- `npm run dev:http` – run MCP server over HTTP (TypeScript via `tsx`)
- `npm run build` – compile to `dist/`
- `npm start` – run compiled server over stdio (`dist/server.js`)
- `npm run start:http` – run compiled server over HTTP (`dist/server.js`)
- `npm test` – run the compiled test harness (`dist/test-harness.js`)
- `npm run get:account -- <accountId>` – call the account-details handler directly (dev helper)

## Run (stdio)

This is the default MCP transport (stdio) for configuring inside an MCP-capable client.

Dev:

```bash
npm run dev
```

Prod:

```bash
npm run build
npm start
```

## Run (HTTP)

This repo supports the MCP Streamable HTTP transport.

Dev:

```bash
npm run dev:http
```

Prod:

```bash
npm run build
npm run start:http
```

Defaults:

- Binds to `127.0.0.1:3000`
- MCP endpoint is `GET/POST /mcp`

### HTTP configuration (env vars)

- `MCP_TRANSPORT`: `stdio` (default) or `http`
- `HOST`: bind address (default `127.0.0.1`)
- `PORT`: listen port (default `3000`)
- `MCP_PATH`: MCP endpoint path (default `/mcp`)
- `MCP_ENABLE_JSON_RESPONSE`: set to `true`/`1` to prefer JSON responses instead of starting an SSE stream
- `MCP_STATELESS`: set to `true`/`1` to disable MCP session ids (stateless mode)

Example:

```bash
MCP_TRANSPORT=http HOST=0.0.0.0 PORT=8787 MCP_PATH=/mcp node dist/server.js
```

## Quick local verification (no MCP client)

`npm test` runs `dist/test-harness.js`, so build first. The test harness uses whatever `DATA_SOURCE` is currently configured; for an offline/safe sanity check, force mock mode:

```bash
export DATA_SOURCE=mock
npm run build
npm test
```

## Example MCP client config

If your MCP client supports launching an MCP server via command:

- Command: `node`
- Args: `dist/server.js`
- Working directory: repo root

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

## Tool I/O examples

### `get_all_accounts`

Input:

```json
{}
```

Output (mock example):

```json
{
  "accounts": [
    {
      "id": "acct_001",
      "name": "Everyday Checking",
      "type": "checking",
      "currency": "USD",
      "balance": 2450.32
    }
  ]
}
```

### `get_account_details`

Input:

```json
{ "accountId": "acct_001" }
```

### `get_account_transactions`

Minimal input:

```json
{ "accountId": "acct_001" }
```

With filters:

```json
{
  "accountId": "acct_001",
  "days": 30,
  "startDate": "2025-11-13",
  "endDate": "2025-12-13",
  "billpayOnly": false,
  "advanced": true,
  "actionCode": "*",
  "sourceCode": "*"
}
```

## Data sources

### Mock (default)

Uses an in-memory dataset in `src/data.ts`.

### Members 1st (optional)

Switch to the Members 1st-backed fetchers:

```bash
export DATA_SOURCE=members1st
```

Important:

- Don’t paste cookies/tokens into this repo or commit them.
- Provide secrets via environment variables only.

#### Members 1st env vars

- `DATA_SOURCE`: `mock` (default) or `members1st`
- `MEMBERS1ST_ACCOUNTS_URL`: defaults to `https://myonline.members1st.org/api/v1/account`
- `MEMBERS1ST_TRANSACTIONS_URL_BASE`: defaults to `https://myonline.members1st.org/api/v1/Transactions`
- `MEMBERS1ST_ORIGIN`: defaults to `https://myonline.members1st.org` (used for `Origin`/`Referer` headers)
- `MEMBERS1ST_COOKIE`: cookie value or full cookie header value (the implementation will wrap bare values as `M1Online=<value>`)
- `MEMBERS1ST_AUTHORIZATION`: value for the `Authorization` header (e.g. `Bearer ...`) if applicable
- `MEMBERS1ST_HEADERS_JSON`: optional JSON object string of extra headers to attach to outbound requests
- `MEMBERS1ST_CACHE_TTL_MS`: cache duration for accounts fetch (default `30000`)
- `MEMBERS1ST_DISABLE_CACHE`: set to `true`/`1` to disable the accounts cache

#### Example

```bash
export DATA_SOURCE=members1st
export MEMBERS1ST_COOKIE='your_cookie_or_cookie_header_here'

npm run dev:http
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Development setup and workflow
- Project structure and architecture
- Testing requirements
- Code style and best practices
- How to submit pull requests

For bug reports and feature requests, please open an issue on GitHub.
