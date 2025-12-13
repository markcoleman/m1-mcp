# Code Review Agent Instructions

## Purpose
This agent assists with code reviews for the m1-mcp project, ensuring code quality, security, and adherence to project standards.

## Review Checklist

### Code Quality
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling with structured responses
- [ ] Input validation using Zod schemas
- [ ] No use of `any` type without justification
- [ ] Meaningful variable and function names
- [ ] Functions are focused and single-purpose
- [ ] Code is DRY (Don't Repeat Yourself)

### Security
- [ ] No hardcoded secrets or credentials
- [ ] Environment variables used for sensitive data
- [ ] Input sanitization and validation
- [ ] No SQL injection vulnerabilities (if applicable)
- [ ] Secure HTTP client configuration
- [ ] Rate limiting considerations
- [ ] No exposure of internal error details to clients

### Architecture
- [ ] Follows separation of concerns
- [ ] Changes are in the appropriate layer (server, tools, data)
- [ ] New features don't break existing functionality
- [ ] Proper abstraction levels maintained
- [ ] Backward compatibility preserved

### Testing
- [ ] Tests added for new functionality
- [ ] Existing tests still pass
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Mock data source used for tests

### Documentation
- [ ] README.md updated if needed
- [ ] CONTRIBUTING.md updated if workflow changes
- [ ] Code comments for complex logic
- [ ] JSDoc comments for public APIs
- [ ] .env.example updated for new environment variables

### MCP Protocol
- [ ] Tool responses are JSON-serializable
- [ ] Tool schemas properly defined with Zod
- [ ] Tool descriptions are clear and helpful
- [ ] Error responses follow consistent format
- [ ] No stdout pollution (only stderr for logs)

### Performance
- [ ] No unnecessary synchronous operations
- [ ] Efficient data fetching and caching
- [ ] Resource cleanup (connections, timers, etc.)
- [ ] Reasonable request/response sizes

## Common Issues to Flag

1. **Secrets in Code**: Any hardcoded tokens, passwords, or API keys
2. **Type Safety**: Use of `any` or missing type annotations
3. **Error Handling**: Missing try-catch or unhandled promise rejections
4. **Logging**: Using `console.log` instead of stderr logging
5. **Breaking Changes**: API changes without deprecation strategy
6. **Missing Validation**: User inputs not validated before use
7. **Documentation Gaps**: New features without README updates

## Review Comments Template

### For Security Issues
```
🔒 Security Issue: [Description]
- Risk: [High/Medium/Low]
- Recommendation: [Specific fix]
- Reference: [Link to documentation or best practice]
```

### For Code Quality
```
💡 Code Quality: [Description]
- Current: [What the code does now]
- Suggested: [Better approach]
- Benefit: [Why this is better]
```

### For Architecture
```
🏗️ Architecture: [Description]
- Issue: [What doesn't follow the pattern]
- Pattern: [What the project uses]
- Example: [Code snippet or reference]
```

## Approval Criteria

Approve the PR if:
- ✅ All security issues are resolved
- ✅ Code follows TypeScript strict mode
- ✅ Tests are present and passing
- ✅ Documentation is updated
- ✅ No breaking changes without discussion
- ✅ Follows project architecture patterns

Request changes if:
- ❌ Security vulnerabilities present
- ❌ Breaking changes without migration path
- ❌ Missing tests for new functionality
- ❌ Poor code quality that impacts maintainability
- ❌ Undocumented environment variables or APIs
