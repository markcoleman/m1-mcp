# Testing Agent Instructions

## Purpose
Guide the creation and execution of tests for the m1-mcp project, ensuring comprehensive test coverage and quality assurance.

## Testing Strategy

### Test Pyramid
1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test complete data flows and tool handlers
3. **System Tests**: Test the full MCP server with both transports

### Test Coverage Goals
- Core functionality: 80%+ coverage
- Error handling paths: All major error scenarios
- Tool handlers: All tools with valid and invalid inputs
- Data sources: Both mock and Members1st implementations

## Test Types and Patterns

### Unit Test Pattern
```typescript
import { describe, it, expect } from 'your-test-framework';

describe('functionName', () => {
  it('should handle valid input correctly', () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = functionName(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
  
  it('should handle invalid input with error', () => {
    const invalidInput = { /* invalid data */ };
    
    expect(() => functionName(invalidInput)).toThrow();
  });
  
  it('should handle edge cases', () => {
    // Test empty inputs, null, undefined, etc.
  });
});
```

### Integration Test Pattern
```typescript
describe('Tool Handler Integration', () => {
  beforeEach(() => {
    // Set up test environment
    process.env.DATA_SOURCE = 'mock';
  });
  
  it('should process valid tool request end-to-end', async () => {
    const request = {
      method: 'tools/call',
      params: {
        name: 'get_account_details',
        arguments: { accountId: 'acct_001' }
      }
    };
    
    const response = await handleToolCall(request);
    
    expect(response).toHaveProperty('content');
    expect(response.isError).toBe(false);
  });
});
```

## Test Scenarios by Component

### Server Tests (server.ts)
- [ ] Server initializes with stdio transport
- [ ] Server initializes with HTTP transport
- [ ] Server handles ListToolsRequest
- [ ] Server handles CallToolRequest
- [ ] Server handles invalid requests gracefully
- [ ] Server cleans up resources on shutdown

### Tool Handler Tests (tools.ts)
- [ ] `get_all_accounts` returns valid account list
- [ ] `get_account_details` with valid ID returns account
- [ ] `get_account_details` with invalid ID returns error
- [ ] `get_account_transactions` with valid params returns transactions
- [ ] `get_account_transactions` validates date ranges
- [ ] `get_account_transactions` handles filter combinations
- [ ] Tool schemas validate inputs correctly
- [ ] Tool handlers return proper JSON structure

### Data Layer Tests (data.ts)
- [ ] Mock data source returns expected accounts
- [ ] Mock data source returns expected transactions
- [ ] Data source switches correctly based on env var
- [ ] Invalid data source falls back to mock
- [ ] Data validation catches malformed data

### Members1st Integration Tests (members1st.ts)
- [ ] API client constructs correct URLs
- [ ] Authentication headers are properly set
- [ ] Cookie handling works correctly
- [ ] Response parsing handles valid data
- [ ] Response parsing handles error responses
- [ ] Caching works as expected
- [ ] Rate limiting is respected
- [ ] Network errors are handled gracefully

### Environment Tests (env.ts)
- [ ] Loads environment variables correctly
- [ ] Provides sensible defaults
- [ ] Handles missing .env file
- [ ] Validates required variables

## Test Data Management

### Mock Data Guidelines
```typescript
// Use consistent test data across tests
const mockAccount = {
  id: "test_acct_001",
  name: "Test Checking",
  type: "checking",
  currency: "USD",
  balance: 1000.00
};

const mockTransaction = {
  id: "test_txn_001",
  accountId: "test_acct_001",
  date: "2025-01-01",
  description: "Test Transaction",
  amount: -50.00,
  balance: 950.00
};
```

### Test Environment Setup
```typescript
// Save original env
const originalEnv = { ...process.env };

beforeEach(() => {
  // Set up clean test environment
  process.env.DATA_SOURCE = 'mock';
  process.env.MEMBERS1ST_CACHE_TTL_MS = '0'; // Disable cache
});

afterEach(() => {
  // Restore original env
  process.env = { ...originalEnv };
});
```

## Test Execution

### Running Tests
```bash
# Build first
npm run build

# Run all tests
npm test

# Run specific test file
tsx src/test-harness.ts

# Run with specific data source
DATA_SOURCE=mock npm test

# Run with debug output
DEBUG=* npm test
```

### Test Environment Variables
```bash
# Required for testing
DATA_SOURCE=mock
MEMBERS1ST_DISABLE_CACHE=true

# Optional for integration tests
MEMBERS1ST_COOKIE=test_cookie
MEMBERS1ST_AUTHORIZATION=test_auth
```

## Testing Checklist for New Features

### Before Writing Code
- [ ] Define test cases for happy path
- [ ] Define test cases for error scenarios
- [ ] Define test cases for edge cases
- [ ] Identify dependencies to mock

### While Writing Code
- [ ] Write tests alongside implementation
- [ ] Run tests frequently during development
- [ ] Use TDD approach where appropriate
- [ ] Keep tests simple and focused

### After Writing Code
- [ ] All tests pass
- [ ] Test coverage meets goals
- [ ] Tests are maintainable
- [ ] Tests run quickly
- [ ] Tests are deterministic (no flaky tests)

## Common Testing Patterns

### Testing Async Functions
```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

it('should handle rejected promises', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Testing Error Handling
```typescript
it('should return structured error response', async () => {
  const result = await handlerFunction({ invalid: 'input' });
  
  expect(result).toHaveProperty('error');
  expect(result.error).toHaveProperty('code');
  expect(result.error).toHaveProperty('message');
});
```

### Mocking External Dependencies
```typescript
// Mock fetch for HTTP calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mock' }),
  })
);
```

### Testing Input Validation
```typescript
it('should validate required fields', () => {
  const schema = GetAccountDetailsInputSchema;
  
  // Valid input
  expect(() => schema.parse({ accountId: 'acct_001' })).not.toThrow();
  
  // Missing required field
  expect(() => schema.parse({})).toThrow();
  
  // Invalid type
  expect(() => schema.parse({ accountId: 123 })).toThrow();
});
```

## Quality Metrics

### Test Quality Indicators
- ✅ Tests are readable and well-named
- ✅ Tests are independent (can run in any order)
- ✅ Tests are fast (< 100ms per test)
- ✅ Tests are reliable (no random failures)
- ✅ Tests provide clear failure messages

### Coverage Targets
- Statements: 80%+
- Branches: 75%+
- Functions: 85%+
- Lines: 80%+

## Troubleshooting Tests

### Common Issues
1. **Flaky Tests**: Check for timing issues, shared state, or external dependencies
2. **Slow Tests**: Profile and optimize, consider mocking expensive operations
3. **False Positives**: Ensure tests actually validate the behavior
4. **False Negatives**: Check for overly strict assertions or test setup issues

### Debugging Failed Tests
```bash
# Run with verbose output
npm test -- --verbose

# Run single test file
tsx src/test-specific.ts

# Enable debug logging
DEBUG=* npm test
```

## Continuous Integration

Tests run automatically in CI on:
- Every push to main and develop branches
- Every pull request
- Multiple Node.js versions (18.x, 20.x, 22.x)

Ensure local tests pass before pushing to avoid CI failures.
