# m1-mcp

Minimal Node.js (TypeScript) MCP server that exposes three tools for account data.

By default it serves a small in-memory mock dataset. You can optionally switch to a "Members 1st" HTTP-backed data source via environment variables.


**New to m1-mcp?** See [QUICKSTART.md](QUICKSTART.md) for a 5-minute getting started guide!
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
│  Mock Data        │    │     members1st/              │
│  (in-memory)      │    │  (HTTP API Integration)      │
│                   │    │  - client.ts (main API)      │
│  - 3 accounts     │    │  - http.ts (requests)        │
│  - 5 transactions │    │  - mappers.ts (transforms)   │
│                   │    │  - logging.ts, headers.ts,   │
│                   │    │    date-utils.ts (utilities) │
└───────────────────┘    └──────────────────────────────┘
```

### Key Components

- **server.ts**: Core MCP server with stdio and HTTP transports
- **tools.ts**: MCP tool definitions and request handlers
- **data.ts**: Data layer abstraction supporting multiple backends
- **members1st/**: Members1st API client module with authentication and caching
  - **client.ts**: Main API client with accounts and transactions fetching
  - **http.ts**: HTTP client utilities with redirect handling
  - **logging.ts**: API request/response logging with ANSI colors
  - **headers.ts**: Header building, sanitization, and cookie handling
  - **date-utils.ts**: Date parsing, formatting, and range chunking
  - **mappers.ts**: Data transformation from API responses to domain types
  - **index.ts**: Public API exports
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
  - optional filters: `startDate`, `endDate` (YYYY-MM-DD, defaults to last 30 days)
  - note: Date ranges exceeding 180 days are automatically chunked and merged

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

### Development and Build

- `npm run dev` – run MCP server over stdio (TypeScript via `tsx`)
- `npm run dev:http` – run MCP server over HTTP (TypeScript via `tsx`)
- `npm run build` – compile to `dist/`
- `npm start` – run compiled server over stdio (`dist/server.js`)
- `npm run start:http` – run compiled server over HTTP (`dist/server.js`)

### Testing

- `npm test` – run all tests (unit tests + integration test)
- `npm run test:unit` – run unit tests with coverage report (compiled)
- `npm run test:unit:dev` – run unit tests in development mode (TypeScript via `tsx`)
- `npm run test:integration` – run integration test harness

### Utilities

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

## Testing

This project includes comprehensive unit tests and integration tests using Node.js native test runner.

### Running Tests

Build the project first, then run tests:

```bash
npm run build
npm test
```

This runs:
1. **Unit tests** with code coverage for utility modules, data layer, and tool handlers
2. **Integration test** that exercises the complete tool workflow

### Test Commands

- **All tests**: `npm test` - runs unit tests with coverage + integration test
- **Unit tests only**: `npm run test:unit` - compiled tests with coverage report
- **Development mode**: `npm run test:unit:dev` - run tests without compiling (faster iteration)
- **Integration test**: `npm run test:integration` - end-to-end workflow test

### Test Coverage

Current test coverage (as of last run):
- **Overall**: 99.46% line coverage, 94.77% branch coverage
- **112 unit tests** covering utility functions, data layer, and tool handlers
- Tests use mock data by default for consistent, offline testing

### Quick Verification

For an offline/safe sanity check with mock data:

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

Minimal input (defaults to last 30 days):

```json
{ "accountId": "acct_001" }
```

With date range:

```json
{
  "accountId": "acct_001",
  "startDate": "2025-11-13",
  "endDate": "2025-12-13"
}
```

For date ranges exceeding 180 days, the request is automatically split into multiple chunks and results are merged.

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
- `MEMBERS1ST_COOKIE_FILE`: path to a file containing the cookie value (alternative to `MEMBERS1ST_COOKIE`, more convenient for long values)
- `MEMBERS1ST_AUTHORIZATION`: value for the `Authorization` header (e.g. `Bearer ...`) if applicable
- `MEMBERS1ST_HEADERS_JSON`: optional JSON object string of extra headers to attach to outbound requests
- `MEMBERS1ST_CACHE_TTL_MS`: cache duration for accounts fetch (default `30000`)
- `MEMBERS1ST_DISABLE_CACHE`: set to `true`/`1` to disable the accounts cache

#### API Request Logging

API requests are logged to stderr with color coding by default (when not in production mode). This helps with debugging and development.

- `LOG_API_REQUESTS`: set to `true`/`1` to enable API request logging, `false`/`0` to disable (default: enabled unless `NODE_ENV=production`)
- `LOG_API_RESPONSES`: set to `true`/`1` to enable API response body logging (default: `false`)
- `NODE_ENV`: set to `production` to disable API request logging by default

Logged information includes:
- Request method and URL path
- Query parameters (with color coding)
- Request headers (with sensitive values like Cookie and Authorization redacted)
- Response status code and message (when `LOG_API_RESPONSES` is enabled)
- Response body preview (when `LOG_API_RESPONSES` is enabled, truncated to 500 characters)

#### Example Usage

**Option 1: Direct cookie value**
```bash
export DATA_SOURCE=members1st
export MEMBERS1ST_COOKIE='your_cookie_or_cookie_header_here'

npm run dev:http
```

**Option 2: Cookie from file (recommended)**
```bash
# Create a cookie file
echo 'your_cookie_value_here' > .members1st-cookie

# Configure to use the file
export DATA_SOURCE=members1st
export MEMBERS1ST_COOKIE_FILE=.members1st-cookie

npm run dev:http
```

The cookie file approach is more convenient as:
- You can easily update the cookie without changing your scripts
- The file is gitignored by default for security
- It works well with MCP client configurations (see `examples/` directory)
- **Automatic retry on 401**: If a request receives a 401 Unauthorized response, the system will automatically reload credentials from the cookie file and retry the request once. This allows you to update expired cookies without restarting the server.

#### Handling Expired Cookies

When using the Members1st backend, cookies may expire after a period of time. The server includes automatic 401 retry logic:

1. If a request returns `401 Unauthorized`, the system will:
   - Log a message to stderr: `[Members1st] Received 401 Unauthorized, reloading credentials and retrying...`
   - Clear any cached account data
   - Reload credentials from the cookie file (or environment variable)
   - Automatically retry the request once

2. To update an expired cookie without restarting the server:
   - When using `MEMBERS1ST_COOKIE_FILE`, simply update the file with the new cookie value
   - The next request will automatically use the updated cookie
   - If a 401 occurs, the retry will read the fresh cookie from the file

3. Example workflow:
   ```bash
   # Server returns 401 with expired cookie
   # Update the cookie file:
   echo 'new_cookie_value' > .members1st-cookie
   # The system automatically retries with the new cookie
   ```

This feature is particularly useful for long-running server instances where cookies may expire during operation.

## CI/CD and Automation

This project uses modern DevOps practices with automated workflows:

### GitHub Actions Workflows

- **CI Pipeline** (`.github/workflows/ci.yml`): 
  - Builds and tests on Node.js 18.x, 20.x, and 22.x
  - Runs security audits
  - Validates TypeScript compilation
  - Uploads build artifacts

- **Release Pipeline** (`.github/workflows/release.yml`):
  - Automated releases on version tags (e.g., `v1.0.0`)
  - Generates changelogs
  - Creates GitHub releases with artifacts
  - Supports npm publishing (if package is public)

- **Security Scanning** (`.github/workflows/codeql.yml`):
  - CodeQL analysis for vulnerabilities
  - Scheduled weekly scans
  - Security alerts for issues

### Dependency Management

- **Dependabot**: Automatically creates PRs for dependency updates
- **npm audit**: Runs on every CI build
- **Grouped updates**: Minor and patch updates grouped together

### GitHub Copilot Assets

AI-assisted development resources available in `.github/`:

- **copilot-instructions.md**: Project-specific guidance for GitHub Copilot
- **agents/**: Specialized instructions for different development tasks
  - `code-review.md`: Code review guidelines and checklist
  - `testing.md`: Testing strategies and patterns
  - `feature-development.md`: Feature implementation guide
  - `bug-fixing.md`: Systematic bug fixing workflow
  - `security.md`: Security best practices and vulnerability handling

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:

- Development setup and workflow
- Project structure and architecture
- Testing requirements
- Code style and best practices
- How to submit pull requests
- CI/CD pipeline details

For bug reports and feature requests, please open an issue on GitHub.
