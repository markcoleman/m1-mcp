# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of m1-mcp seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly

Please do **not** create public GitHub issues for security vulnerabilities. Public disclosure could put users at risk.

### 2. Report Via Email

Send details of the vulnerability to the project maintainers via GitHub's private vulnerability reporting feature or by contacting the repository owner directly.

### 3. Include These Details

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Suggested fix (if you have one)
- Your contact information

### 4. What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Assessment**: We'll investigate and assess the severity within 5 business days
- **Updates**: We'll keep you informed of our progress
- **Fix**: We'll work on a fix and coordinate disclosure timing with you
- **Credit**: We'll credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices for Users

### Environment Variables

**Never commit sensitive data to version control:**

```bash
# ✅ Good: Use .env file (gitignored)
cp .env.example .env
# Edit .env with your secrets

# ❌ Bad: Never do this
git add .env
git commit -m "Added credentials"  # NEVER!
```

### API Keys and Tokens

**Rotate credentials regularly:**
- Change API keys every 90 days
- Use separate keys for development and production
- Revoke unused keys immediately

### Running the Server

**Use least privilege principles:**
```bash
# Run as non-root user
npm start

# Don't expose to public internet without proper security
# Use firewall rules to restrict access
```

### Dependencies

**Keep dependencies updated:**
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Review Dependabot PRs promptly
```

## Known Security Considerations

### 1. Member1st Integration

When using the Members1st data source:

- **Credentials Storage**: Store cookies and tokens in environment variables only
- **Token Expiration**: Tokens expire and must be refreshed manually
- **Rate Limiting**: Respect API rate limits to avoid account suspension
- **Data Sensitivity**: Account data contains PII; handle appropriately

### 2. MCP Protocol

When exposing via MCP:

- **Client Trust**: Only connect to trusted MCP clients
- **Data Exposure**: All account data is accessible to the MCP client
- **No Authentication**: The MCP server itself has no authentication layer
- **Transport Security**: Use secure transport (stdio or HTTPS for HTTP transport)

### 3. HTTP Transport

When using HTTP transport:

- **Bind Address**: Default binds to 127.0.0.1 (localhost only)
- **Public Exposure**: Do not expose to public internet without authentication
- **TLS**: Use reverse proxy with TLS for remote access
- **CORS**: Configure CORS appropriately if needed

## Security Features

### Input Validation

- All tool inputs validated with Zod schemas
- String length limits enforced
- Type checking at runtime
- Date format validation

### Error Handling

- Errors logged to stderr, not stdout
- No stack traces exposed to clients
- Generic error messages for security issues
- Detailed internal logging for debugging

### Dependency Security

- Automated security scanning with CodeQL
- npm audit on every CI build
- Dependabot for automatic updates
- Minimal dependency footprint

### Environment Security

- .env file gitignored by default
- .env.example with no real secrets
- Environment variable validation on startup
- Secure defaults for all configuration

## Security Update Process

### For Maintainers

When a security issue is reported:

1. **Triage**: Assess severity (Critical/High/Medium/Low)
2. **Fix**: Develop and test fix in private branch
3. **Advisory**: Prepare security advisory
4. **Release**: Create security release
5. **Disclose**: Publish advisory and notify users
6. **Document**: Update SECURITY.md with details

### Severity Levels

- **Critical**: Remote code execution, credential exposure
- **High**: Authentication bypass, data breach
- **Medium**: Information disclosure, DoS
- **Low**: Minor information leakage, local issues

## Compliance

### Data Privacy

This application may process financial data. Users are responsible for:

- Compliance with GDPR, CCPA, and other privacy laws
- Implementing appropriate data retention policies
- Obtaining necessary consents from data subjects
- Securing data in transit and at rest

### Financial Regulations

When handling financial data:

- Follow PCI DSS guidelines if handling payment card data
- Implement appropriate access controls
- Maintain audit logs of data access
- Encrypt sensitive data

## Security Checklist for Deployments

Before deploying:

- [ ] All environment variables set correctly
- [ ] No secrets in code or committed files
- [ ] Dependencies updated and audited
- [ ] Server bound to appropriate interface
- [ ] Firewall rules configured
- [ ] Monitoring and logging enabled
- [ ] Backup and recovery plan in place
- [ ] Incident response plan documented

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [TypeScript Security](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html)

## Contact

For security concerns, contact the project maintainers through GitHub.

## Updates

This security policy is reviewed and updated quarterly. Last updated: 2025-01-15
