# Bug Fixing Agent Instructions

## Purpose
Guide the process of identifying, diagnosing, and fixing bugs in the m1-mcp project systematically and safely.

## Bug Fix Workflow

### 1. Reproduction Phase
- [ ] Understand the bug report or issue
- [ ] Identify steps to reproduce
- [ ] Reproduce the bug locally
- [ ] Document the current behavior
- [ ] Define the expected behavior
- [ ] Determine severity and priority

### 2. Investigation Phase
- [ ] Review relevant code sections
- [ ] Check recent changes (git history)
- [ ] Review error logs and stack traces
- [ ] Identify root cause vs symptoms
- [ ] Consider side effects and dependencies
- [ ] Review related tests

### 3. Fix Design Phase
- [ ] Plan the minimal fix required
- [ ] Consider edge cases
- [ ] Ensure backward compatibility
- [ ] Plan for testing the fix
- [ ] Consider if documentation needs updates
- [ ] Identify any needed refactoring

### 4. Implementation Phase
- [ ] Create bug fix branch
- [ ] Implement the fix
- [ ] Add regression tests
- [ ] Verify fix works for all scenarios
- [ ] Check for side effects
- [ ] Update error messages if needed

### 5. Validation Phase
- [ ] Run all existing tests
- [ ] Run new regression tests
- [ ] Manual testing with both transports
- [ ] Test with both data sources
- [ ] Performance check
- [ ] Security review of changes

## Bug Categories and Common Fixes

### Type 1: Runtime Errors

**Symptoms:**
- Application crashes
- Unhandled promise rejections
- Type errors at runtime

**Investigation:**
```bash
# Check error logs
npm run dev 2>&1 | tee debug.log

# Run with debugging
DEBUG=* npm run dev

# Check stack trace in error logs
```

**Common Causes:**
1. Missing null/undefined checks
2. Type mismatches not caught by TypeScript
3. Unhandled async errors
4. Missing error boundaries

**Fix Pattern:**
```typescript
// ❌ Before: No null check
function processAccount(account: Account) {
  return account.name.toUpperCase();
}

// ✅ After: Safe null handling
function processAccount(account: Account | null) {
  if (!account) {
    throw new Error("Account is required");
  }
  return account.name.toUpperCase();
}

// ✅ Alternative: Optional chaining
function getAccountName(account: Account | null): string {
  return account?.name?.toUpperCase() || "Unknown";
}
```

### Type 2: Logic Errors

**Symptoms:**
- Wrong output or behavior
- Data transformation issues
- Incorrect calculations

**Investigation:**
```typescript
// Add debug logging
console.error("[DEBUG] Input:", JSON.stringify(input));
console.error("[DEBUG] Intermediate:", intermediate);
console.error("[DEBUG] Output:", JSON.stringify(output));

// Use Node debugger
node --inspect-brk dist/server.js
```

**Common Causes:**
1. Incorrect conditions or operators
2. Off-by-one errors
3. Wrong data transformations
4. Incorrect assumptions about data format

**Fix Pattern:**
```typescript
// ❌ Before: Wrong condition
if (balance > 0 || balance === 0) {
  // Process positive balances only
}

// ✅ After: Correct condition
if (balance >= 0) {
  // Process positive balances including zero
}

// ❌ Before: Mutation bug
function updateAccount(account: Account) {
  account.balance = newBalance; // Mutates original
  return account;
}

// ✅ After: Immutable update
function updateAccount(account: Account): Account {
  return { ...account, balance: newBalance };
}
```

### Type 3: Data Handling Issues

**Symptoms:**
- Data not loading
- Incorrect data format
- Cache issues

**Investigation:**
```bash
# Test with mock data
DATA_SOURCE=mock npm test

# Test with real API
DATA_SOURCE=members1st npm run dev

# Check network requests
# Enable verbose HTTP logging
```

**Common Causes:**
1. API response format changes
2. Missing data transformations
3. Cache not invalidating
4. Incorrect error handling for API failures

**Fix Pattern:**
```typescript
// ❌ Before: Assumes data structure
function parseAccounts(response: any): Account[] {
  return response.accounts.map(a => ({
    id: a.id,
    name: a.name
  }));
}

// ✅ After: Validates and handles missing data
function parseAccounts(response: unknown): Account[] {
  if (!response || typeof response !== 'object') {
    throw new Error("Invalid response format");
  }
  
  const data = response as { accounts?: any[] };
  if (!Array.isArray(data.accounts)) {
    throw new Error("Response missing accounts array");
  }
  
  return data.accounts.map(a => ({
    id: String(a.id || ''),
    name: String(a.name || 'Unknown'),
    type: String(a.type || 'unknown'),
    currency: String(a.currency || 'USD'),
    balance: Number(a.balance || 0)
  }));
}
```

### Type 4: MCP Protocol Issues

**Symptoms:**
- Tools not appearing in client
- Tool calls failing
- Response format errors

**Investigation:**
```bash
# Check tool list
# Test stdio transport
npm run dev

# Test HTTP transport
npm run dev:http

# Check MCP response format
# Use MCP inspector or client debugging
```

**Common Causes:**
1. Incorrect tool schema
2. Invalid JSON in responses
3. stdout pollution
4. Wrong content type in responses

**Fix Pattern:**
```typescript
// ❌ Before: Logging to stdout
console.log("Processing request...");

// ✅ After: Logging to stderr
console.error("[INFO] Processing request...");

// ❌ Before: Invalid tool response
function handleTool() {
  return "string result"; // Invalid
}

// ✅ After: Proper MCP response
function handleTool() {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({ result: "data" })
    }]
  };
}
```

### Type 5: Environment/Configuration Issues

**Symptoms:**
- Works locally but not in CI
- Works with one data source but not another
- Intermittent failures

**Investigation:**
```bash
# Check environment variables
printenv | grep -E "(DATA_SOURCE|MEMBERS1ST|MCP_)"

# Test with different environments
DATA_SOURCE=mock npm test
DATA_SOURCE=members1st npm test

# Check .env file
cat .env

# Verify defaults
grep "process.env" src/*.ts
```

**Common Causes:**
1. Missing environment variables
2. Different behavior in different environments
3. Timing issues or race conditions
4. Platform-specific behavior

**Fix Pattern:**
```typescript
// ❌ Before: No default value
const apiUrl = process.env.API_URL;

// ✅ After: Safe default
const apiUrl = process.env.API_URL || "https://api.default.com";

// ❌ Before: Assumes env var exists
if (process.env.FEATURE_ENABLED === "true") {
  // ...
}

// ✅ After: Handles missing var
const featureEnabled = process.env.FEATURE_ENABLED === "true" || false;
if (featureEnabled) {
  // ...
}
```

## Debugging Tools and Techniques

### Console Debugging
```typescript
// Always use stderr for debugging
console.error("[DEBUG] Variable:", variable);
console.error("[DEBUG] Type:", typeof variable);
console.error("[DEBUG] JSON:", JSON.stringify(variable, null, 2));

// Stack trace
console.error(new Error().stack);

// Performance timing
const start = Date.now();
// ... operation
console.error(`[PERF] Operation took ${Date.now() - start}ms`);
```

### TypeScript Type Checking
```bash
# Check types without building
npx tsc --noEmit

# Watch mode for live type checking
npx tsc --noEmit --watch
```

### Node.js Debugger
```bash
# Start with debugger
node --inspect-brk dist/server.js

# Then connect with Chrome DevTools at:
# chrome://inspect
```

### Testing Specific Scenarios
```bash
# Test specific account
npm run get:account -- acct_001

# Test with debug
DEBUG=* npm run get:account -- acct_001

# Test members1st integration
npm run test:members1st-cookie
npm run test:members1st-transactions
```

## Bug Fix Testing Checklist

- [ ] Bug is reproducible before fix
- [ ] Bug is fixed after changes
- [ ] Existing tests still pass
- [ ] New regression test added
- [ ] Fix works with mock data source
- [ ] Fix works with Members1st data source
- [ ] Fix works with stdio transport
- [ ] Fix works with HTTP transport
- [ ] No new TypeScript errors
- [ ] No new console warnings
- [ ] Performance not degraded
- [ ] Error messages are clear
- [ ] Documentation updated if needed

## Regression Test Pattern

```typescript
// Add test to test-harness.ts or create new test file
describe('Bug #123: Description', () => {
  it('should not crash when account is null', async () => {
    // Setup: Create scenario that caused the bug
    const input = { accountId: null };
    
    // Execute: Call the function that had the bug
    const result = await handleGetAccountDetails(input);
    
    // Verify: Check that it's fixed
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe('INVALID_INPUT');
  });
  
  it('should handle the happy path correctly', async () => {
    // Also test that the fix didn't break normal operation
    const input = { accountId: 'acct_001' };
    const result = await handleGetAccountDetails(input);
    
    expect(result).toHaveProperty('account');
    expect(result.error).toBeUndefined();
  });
});
```

## Common Bug Patterns

### Pattern 1: Async/Await Issues
```typescript
// ❌ Bug: Missing await
async function getData() {
  const result = fetchData(); // Returns Promise, not data
  return result.value; // Error: undefined
}

// ✅ Fix: Await the promise
async function getData() {
  const result = await fetchData();
  return result.value;
}
```

### Pattern 2: Error Swallowing
```typescript
// ❌ Bug: Errors are hidden
try {
  await riskyOperation();
} catch (error) {
  // Silent failure
}

// ✅ Fix: Handle or propagate errors
try {
  await riskyOperation();
} catch (error) {
  console.error("[ERROR]", error);
  throw new Error("Failed to complete operation");
}
```

### Pattern 3: Type Coercion Issues
```typescript
// ❌ Bug: Loose equality can cause issues
if (value == null) { // Matches both null and undefined
  // Might not be what you want
}

// ✅ Fix: Use strict equality
if (value === null || value === undefined) {
  // Explicit and clear
}

// Or use nullish coalescing
const result = value ?? defaultValue;
```

### Pattern 4: Date Handling
```typescript
// ❌ Bug: Date parsing can vary by locale
const date = new Date("01/02/2025"); // Ambiguous

// ✅ Fix: Use ISO format
const date = new Date("2025-01-02");

// Or parse explicitly
const [year, month, day] = dateString.split("-").map(Number);
const date = new Date(year, month - 1, day);
```

## Documentation for Bug Fixes

### Commit Message Format
```
fix: Brief description of the bug

Fixes #123

- Detailed description of the bug
- Root cause identified
- Changes made to fix
- Regression test added

Before: [describe buggy behavior]
After: [describe correct behavior]
```

### Code Comments
```typescript
// Bug #123: Handle null accounts returned from API
// Previously this would crash with "Cannot read property 'name' of null"
// Now we check for null and return an appropriate error
if (!account) {
  return {
    error: {
      code: "ACCOUNT_NOT_FOUND",
      message: `Account ${accountId} not found`
    }
  };
}
```

## When to Escalate

Consider escalating if:
- Root cause is unclear after investigation
- Fix requires significant refactoring
- Fix might have widespread side effects
- Bug is in third-party dependency
- Security implications are uncertain
- Multiple interacting bugs exist

## Prevention

After fixing a bug:
1. Add it to regression test suite
2. Document the pattern in code comments
3. Update coding guidelines if needed
4. Share learnings with team
5. Consider if similar bugs exist elsewhere
