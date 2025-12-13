# Contributing to m1-mcp

Thank you for your interest in contributing to m1-mcp! This document provides guidelines and instructions for developers.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)

## Development Setup

### Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/markcoleman/m1-mcp.git
   cd m1-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (optional for mock mode)
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## Project Structure

```
m1-mcp/
├── src/
│   ├── server.ts              # Main MCP server implementation
│   ├── tools.ts               # Tool handlers and schemas
│   ├── data.ts                # Data layer (mock and Members1st)
│   ├── members1st.ts          # Members1st API integration
│   ├── env.ts                 # Environment variable loader
│   ├── test-harness.ts        # Basic integration test
│   ├── run-get-account.ts     # CLI utility for testing
│   └── test-*.ts              # Unit tests for specific features
├── dist/                      # Compiled JavaScript output
├── README.md                  # User documentation
└── CONTRIBUTING.md            # This file
```

### Key Components

- **server.ts**: Implements the MCP server with both stdio and HTTP transports
- **tools.ts**: Defines the three MCP tools (get_all_accounts, get_account_details, get_account_transactions)
- **data.ts**: Provides data abstraction layer with mock and Members1st backends
- **members1st.ts**: HTTP client for Members1st API with account and transaction fetching

## Development Workflow

### Running in Development Mode

**Stdio transport (default):**
```bash
npm run dev
```

**HTTP transport:**
```bash
npm run dev:http
```

The HTTP server will listen on `http://127.0.0.1:3000/mcp` by default.

### Building

Compile TypeScript to JavaScript:
```bash
npm run build
```

Output will be in the `dist/` directory.

### Testing Tools Directly

Test a specific account:
```bash
npm run get:account -- acct_001
```

Test with Members1st backend:
```bash
DATA_SOURCE=members1st npm run get:account -- acct_001
```

## Testing

### Integration Tests

Run the test harness (tests all three tools):
```bash
npm test
```

Run with mock data explicitly:
```bash
DATA_SOURCE=mock npm test
```

### Unit Tests

Test Members1st cookie handling:
```bash
npm run test:members1st-cookie
```

Test Members1st transactions API:
```bash
npm run test:members1st-transactions
```

### Manual Testing

1. Build the project
2. Configure your MCP client to use this server
3. Test each tool through the MCP client interface

## Code Style

This project uses TypeScript with strict mode enabled. Please follow these guidelines:

### TypeScript

- Use TypeScript strict mode features
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types that are part of the public API

### Formatting

- Use 2 spaces for indentation
- Use double quotes for strings
- Add semicolons at the end of statements
- Keep lines under 120 characters when possible

### Naming Conventions

- Use `camelCase` for variables and functions
- Use `PascalCase` for types and interfaces
- Use `UPPER_CASE` for constants
- Use descriptive names that explain intent

### Error Handling

- Use structured error responses with `code` and `message` fields
- Validate input using Zod schemas
- Handle network errors gracefully
- Log errors to stderr, not stdout (to avoid polluting MCP communication)

### Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Sanitize user input and HTTP headers
- Validate URLs before making requests
- Set reasonable limits on request/response sizes

## Submitting Changes

### Before Submitting

1. Ensure your code builds without errors:
   ```bash
   npm run build
   ```

2. Run tests to verify functionality:
   ```bash
   npm test
   ```

3. Test both mock and Members1st data sources if applicable

4. Update documentation if you've changed:
   - Tool interfaces or behavior
   - Environment variables
   - Configuration options
   - Dependencies

### Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Add tests for new functionality
5. Update README.md and other docs as needed
6. Ensure all tests pass
7. Submit a pull request

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include examples of how to use new features
- Keep changes focused (one feature/fix per PR)

## Adding New Data Sources

To add a new data source:

1. Create a new file in `src/` (e.g., `src/newbank.ts`)
2. Implement functions matching the signatures in `data.ts`:
   - `getAllAccounts(): Promise<Account[]>`
   - `getAccountById(id: string): Promise<Account | undefined>`
   - `getTransactionsForAccount(id: string, opts): Promise<Transaction[]>`
3. Update `data.ts` to call your implementation based on `DATA_SOURCE` env var
4. Add environment variables to `.env.example`
5. Document the new data source in README.md
6. Add tests for the new integration

## Questions or Issues?

- Open an issue on GitHub for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed reproduction steps for bugs

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
