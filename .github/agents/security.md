# Security Agent Instructions

## Purpose
Guide security best practices and vulnerability assessment for the m1-mcp project, ensuring secure coding and safe handling of sensitive data.

## Security Principles

### Core Security Tenets
1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal access required to function
3. **Secure by Default**: Security built-in, not bolted-on
4. **Zero Trust**: Validate everything, trust nothing
5. **Privacy First**: Protect user data at all times

## Security Review Checklist

### Authentication & Authorization
- [ ] No hardcoded credentials in code
- [ ] API keys and tokens loaded from environment variables
- [ ] Sensitive data not logged or exposed
- [ ] Authentication headers properly set
- [ ] Authorization checks before data access
- [ ] Session management secure (if applicable)

### Input Validation
- [ ] All external inputs validated
- [ ] Zod schemas used for type validation
- [ ] String lengths limited to prevent DoS
- [ ] URL validation before making requests
- [ ] File path validation (if applicable)
- [ ] SQL injection prevention (if using databases)
- [ ] Command injection prevention (if using shell)

### Data Protection
- [ ] Secrets never committed to repository
- [ ] .env file in .gitignore
- [ ] Sensitive data encrypted at rest (if stored)
- [ ] Sensitive data encrypted in transit (HTTPS)
- [ ] No sensitive data in logs
- [ ] No sensitive data in error messages
- [ ] PII handled according to regulations

### Network Security
- [ ] HTTPS used for all external API calls
- [ ] Certificate validation enabled
- [ ] Rate limiting implemented
- [ ] Timeout values set
- [ ] Request size limits enforced
- [ ] Response size limits enforced
- [ ] CORS properly configured (if applicable)

### Error Handling
- [ ] Errors don't expose internal details
- [ ] Stack traces not sent to clients
- [ ] Generic error messages for security issues
- [ ] Detailed errors logged securely
- [ ] No information leakage in error responses

### Dependencies
- [ ] Dependencies regularly updated
- [ ] Vulnerability scanning in CI/CD
- [ ] Dependabot enabled
- [ ] Minimal dependencies used
- [ ] Dependencies from trusted sources
- [ ] License compliance checked

## Common Vulnerabilities and Fixes

### 1. Exposed Credentials

**❌ Vulnerable:**
```typescript
const apiKey = "sk_live_abc123"; // Hardcoded
const cookie = "sessionid=xyz"; // In code
```

**✅ Secure:**
```typescript
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable required");
}

// In .env (gitignored)
// API_KEY=sk_live_abc123
```

**Detection:**
```bash
# Scan for potential secrets
git grep -i "password\|secret\|api_key\|token" src/

# Use git-secrets or similar tools
git secrets --scan
```

### 2. Injection Vulnerabilities

**❌ Vulnerable to Command Injection:**
```typescript
import { exec } from 'child_process';
exec(`ls -la ${userInput}`); // NEVER DO THIS
```

**✅ Secure:**
```typescript
// Use safe APIs instead of shell commands
import { readdir } from 'fs/promises';
const files = await readdir(directory);
```

**❌ Vulnerable to Path Traversal:**
```typescript
const filePath = `/data/${userInput}`; // Could be ../../../etc/passwd
```

**✅ Secure:**
```typescript
import { join, normalize, resolve } from 'path';
const basePath = '/data';
const safePath = resolve(basePath, normalize(userInput));
if (!safePath.startsWith(basePath)) {
  throw new Error("Invalid path");
}
```

### 3. Unvalidated Input

**❌ Vulnerable:**
```typescript
function getAccount(accountId: any) {
  return fetch(`/api/accounts/${accountId}`); // No validation
}
```

**✅ Secure:**
```typescript
import { z } from 'zod';

const AccountIdSchema = z.string()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/);

function getAccount(accountId: string) {
  const validated = AccountIdSchema.parse(accountId);
  return fetch(`/api/accounts/${validated}`);
}
```

### 4. Information Disclosure

**❌ Vulnerable:**
```typescript
app.use((error, req, res, next) => {
  res.status(500).json({
    error: error.stack, // Exposes internal details
    config: process.env // NEVER expose env vars
  });
});
```

**✅ Secure:**
```typescript
app.use((error, req, res, next) => {
  console.error("[ERROR]", error); // Log internally
  
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An error occurred" // Generic message
    }
  });
});
```

### 5. Insecure HTTP Requests

**❌ Vulnerable:**
```typescript
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false // DISABLES CERTIFICATE VALIDATION
});

fetch(url, { agent }); // Vulnerable to MITM
```

**✅ Secure:**
```typescript
// Use default secure settings
const response = await fetch(url); // Validates certificates

// Or if custom agent needed:
const agent = new https.Agent({
  rejectUnauthorized: true, // Default, but explicit
  minVersion: 'TLSv1.2' // Enforce minimum TLS version
});
```

### 6. Denial of Service (DoS)

**❌ Vulnerable:**
```typescript
// No limits on request size
app.post('/data', async (req, res) => {
  const data = await req.json(); // Could be gigabytes
  processData(data);
});
```

**✅ Secure:**
```typescript
// Limit request size
app.use(express.json({ limit: '1mb' }));

// Limit array lengths
const TransactionsSchema = z.object({
  transactions: z.array(z.any()).max(1000) // Max 1000 items
});

// Timeout long operations
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

### 7. Cross-Site Scripting (XSS)

**❌ Vulnerable (if rendering in web context):**
```typescript
const html = `<div>${userInput}</div>`; // Direct injection
```

**✅ Secure:**
```typescript
// For MCP server, always return JSON
const response = {
  content: [{
    type: "text",
    text: JSON.stringify({ message: userInput }) // JSON encoded
  }]
};

// If HTML needed (not typical for MCP):
import { escape } from 'html-escaper';
const html = `<div>${escape(userInput)}</div>`;
```

### 8. Insufficient Logging

**❌ Insufficient:**
```typescript
try {
  await dangerousOperation();
} catch (error) {
  // No logging
}
```

**✅ Secure:**
```typescript
try {
  await dangerousOperation();
} catch (error) {
  console.error("[SECURITY] Failed operation", {
    timestamp: new Date().toISOString(),
    operation: "dangerousOperation",
    error: error instanceof Error ? error.message : "Unknown",
    // Don't log sensitive data
  });
  throw error;
}
```

## Security Testing

### Manual Security Testing

```bash
# 1. Check for secrets in code
git grep -i "password\|secret\|api_key\|token\|bearer" src/
git log -p | grep -i "password\|secret\|api_key"

# 2. Check for hardcoded IPs or URLs
git grep -E "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" src/
git grep "http://" src/ # Should use https

# 3. Verify .env is gitignored
git check-ignore .env # Should be ignored

# 4. Check dependencies for vulnerabilities
npm audit
npm audit --audit-level=high

# 5. Review environment variable usage
grep -r "process.env" src/
```

### Automated Security Testing

```bash
# Run npm audit in CI
npm audit --audit-level=moderate

# Use security linting (if configured)
npm run lint:security

# CodeQL scanning (via GitHub Actions)
# Configured in .github/workflows/codeql.yml
```

### Penetration Testing Scenarios

1. **Input Validation Bypass**
   - Try special characters in inputs
   - Test with very long strings
   - Test with null/undefined values
   - Test with unexpected types

2. **Authentication Bypass**
   - Test without credentials
   - Test with expired credentials
   - Test with malformed credentials

3. **Rate Limiting**
   - Send many requests quickly
   - Verify rate limits work

4. **Error Information Disclosure**
   - Trigger errors intentionally
   - Verify no stack traces exposed
   - Check error messages for sensitive info

## Environment Variable Security

### Secure Environment Management

**✅ Good Practices:**
```bash
# .env (gitignored, local only)
API_KEY=sk_live_abc123
DATABASE_URL=postgresql://user:pass@localhost/db

# .env.example (committed, no secrets)
API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:password@host/database
```

**Required Checks:**
```typescript
// Check for required secrets
function validateEnvironment() {
  const required = ['API_KEY', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Call on startup
validateEnvironment();
```

### Secrets in CI/CD

```yaml
# GitHub Actions - Use secrets
- name: Run tests
  run: npm test
  env:
    API_KEY: ${{ secrets.API_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## API Security Best Practices

### Request Validation
```typescript
import { z } from 'zod';

const RequestSchema = z.object({
  accountId: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  limit: z.number().min(1).max(100).optional()
});

async function handleRequest(rawInput: unknown) {
  // Validate first
  const input = RequestSchema.parse(rawInput);
  
  // Additional business logic validation
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (start > end) {
    throw new Error("Start date must be before end date");
  }
  
  // Proceed with validated input
  return await processRequest(input);
}
```

### Rate Limiting
```typescript
// Simple in-memory rate limiting
const requestCounts = new Map<string, number[]>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;
  
  const requests = requestCounts.get(clientId) || [];
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  requestCounts.set(clientId, recentRequests);
  return true;
}
```

### Secure Headers (for HTTP transport)
```typescript
// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## Incident Response

### If Credentials are Leaked

1. **Immediate Actions:**
   ```bash
   # Revoke compromised credentials immediately
   # Rotate all potentially affected secrets
   # Remove from git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Notification:**
   - Notify security team
   - Document incident
   - Review access logs
   - Update security procedures

3. **Prevention:**
   - Add to git-secrets patterns
   - Update security training
   - Implement pre-commit hooks
   - Review all similar code

### If Vulnerability is Discovered

1. **Assessment:**
   - Severity (Critical/High/Medium/Low)
   - Impact scope
   - Exploitability
   - Affected versions

2. **Remediation:**
   - Develop fix quickly
   - Test thoroughly
   - Prepare security advisory
   - Coordinate disclosure

3. **Disclosure:**
   - Follow responsible disclosure
   - Notify affected users
   - Publish security advisory
   - Update documentation

## Security Documentation

### Document Security Decisions
```typescript
/**
 * Authentication header builder
 * 
 * Security considerations:
 * - API key loaded from environment, never hardcoded
 * - Bearer token format required by API
 * - No logging of credentials
 * - Validated for presence before use
 * 
 * @throws {Error} If API_KEY environment variable not set
 */
function buildAuthHeader(): Record<string, string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable required");
  }
  return {
    'Authorization': `Bearer ${apiKey}`
  };
}
```

### Security Changelog
Maintain SECURITY.md:
```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities to: security@example.com

Do not create public GitHub issues for security vulnerabilities.

## Security Updates

### 2025-01-15
- Fixed: Credentials exposure in error messages
- Fixed: Input validation bypass in account ID
- Updated: Dependencies with known vulnerabilities
```

## Compliance Considerations

### Data Privacy (GDPR, CCPA)
- Document what data is collected
- Implement data retention policies
- Provide data export capabilities
- Allow data deletion requests
- Log data access appropriately

### Financial Data (PCI DSS, if applicable)
- Never store credit card numbers
- Encrypt sensitive financial data
- Implement access controls
- Audit all data access
- Use secure transmission

## Security Checklist for Releases

Before each release:
- [ ] All dependencies updated
- [ ] npm audit shows no high/critical issues
- [ ] CodeQL scan passed
- [ ] No secrets in code
- [ ] Security review completed
- [ ] SECURITY.md updated
- [ ] Environment variables documented
- [ ] Error handling reviewed
- [ ] Input validation reviewed
- [ ] Authentication reviewed
- [ ] HTTPS enforced
- [ ] Logging doesn't expose sensitive data
