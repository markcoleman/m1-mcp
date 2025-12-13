# GitHub Copilot Instructions for m1-mcp

This file provides context and guidance for GitHub Copilot when working on the m1-mcp project.

## Project Overview

m1-mcp is a TypeScript-based MCP (Model Context Protocol) server that provides financial account data tools. The server supports both stdio and HTTP transports and can work with either mock data or a Members 1st API backend.

## Architecture Principles

1. **Separation of Concerns**: The codebase is organized into distinct layers:
   - `server.ts`: MCP server implementation and transport handling
   - `tools.ts`: MCP tool definitions and request handlers
   - `data.ts`: Data abstraction layer for backend switching
   - `members1st.ts`: External API integration
   - `env.ts`: Environment configuration management

2. **Type Safety**: This project uses TypeScript with strict mode enabled. Always:
   - Use explicit types instead of `any`
   - Define interfaces for data structures
   - Validate inputs using Zod schemas
   - Handle errors with proper typing

3. **Configuration**: All environment-specific settings should be:
   - Defined in `.env.example` with documentation
   - Loaded via `src/env.ts`
   - Never hardcoded in source files
   - Never committed to version control

## Code Style Guidelines

### TypeScript
- Use TypeScript strict mode features
- Prefer `interface` over `type` for object shapes
- Use `const` by default, `let` only when reassignment is needed
- Always specify return types for functions
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators

### Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, and classes
- `UPPER_SNAKE_CASE` for environment variables and constants
- Prefix private properties with underscore: `_privateProperty`

### Error Handling
- Use structured error responses with `code` and `message` fields
- Log errors to stderr to avoid polluting MCP communication
- Validate all external inputs before processing
- Provide meaningful error messages for debugging

### Security Best Practices
- Never commit secrets or credentials
- Use environment variables for all sensitive data
- Validate and sanitize all user inputs
- Set reasonable limits on request/response sizes
- Use HTTPS for all external API calls
- Implement rate limiting for external API calls

## Common Patterns

### Adding a New MCP Tool
1. Define the tool schema in `tools.ts` using Zod
2. Add the tool handler function
3. Register the tool in the tool list
4. Update README.md with tool documentation
5. Add test cases in `test-harness.ts`

Example:
```typescript
// Define schema
const GetNewToolInputSchema = z.object({
  param: z.string().describe("Parameter description"),
});

// Add handler
async function handleGetNewTool(args: z.infer<typeof GetNewToolInputSchema>) {
  // Implementation
  return { result: "data" };
}

// Register tool
{
  name: "get_new_tool",
  description: "Tool description",
  inputSchema: zodToJsonSchema(GetNewToolInputSchema),
}
```

### Adding a New Data Source
1. Create a new file: `src/newsource.ts`
2. Implement required functions matching `data.ts` signatures
3. Update `data.ts` to route based on `DATA_SOURCE` env var
4. Add configuration to `.env.example`
5. Document in README.md
6. Add integration tests

### Working with Environment Variables
1. Add new variable to `.env.example` with description
2. Load in `src/env.ts` using `process.env`
3. Provide sensible defaults where appropriate
4. Document in README.md configuration section

## Testing Guidelines

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies
- Cover edge cases and error conditions
- Use descriptive test names

### Integration Tests
- Test complete data flows
- Use mock data source for consistent results
- Verify tool input/output formats
- Test error handling paths

### Running Tests
```bash
# Build first
npm run build

# Run integration tests
npm test

# Test with specific data source
DATA_SOURCE=mock npm test
```

## Development Workflow

1. **Before Starting**:
   - Pull latest changes from main
   - Install dependencies: `npm install`
   - Copy `.env.example` to `.env`
   - Build project: `npm run build`

2. **During Development**:
   - Use `npm run dev` for live development with stdio
   - Use `npm run dev:http` for HTTP transport testing
   - Test changes with `npm test` before committing
   - Follow TypeScript strict mode requirements

3. **Before Committing**:
   - Ensure code builds without errors
   - Run tests and verify they pass
   - Update documentation if needed
   - Check for security issues and secrets

## MCP Protocol Specifics

### Tool Response Format
- Always return JSON-serializable objects
- Wrap responses in MCP text content format
- Use consistent field names across tools
- Include error details in error responses

### Transport Considerations
- **stdio**: Default transport, used by most MCP clients
- **HTTP**: Alternative transport, supports SSE and JSON responses
- Both transports use the same tool handlers
- Test both transports when making changes

## Dependencies Management

### Adding Dependencies
1. Check if dependency is necessary
2. Prefer well-maintained packages with recent updates
3. Review security advisories before adding
4. Use specific version ranges in package.json
5. Document why the dependency is needed

### Updating Dependencies
- Review changelogs before updating
- Test thoroughly after updates
- Update documentation if APIs change
- Monitor Dependabot PRs

## Common Issues and Solutions

### TypeScript Errors
- Check `tsconfig.json` for strict mode settings
- Ensure all types are properly imported
- Use type guards for runtime type checking
- Avoid using `any` type

### MCP Communication Issues
- Verify stdio streams are not polluted with logs
- Use stderr for all logging, never stdout
- Check JSON formatting in tool responses
- Ensure proper error object structure

### Data Source Issues
- Verify environment variables are set
- Check API endpoints and authentication
- Test with mock data source first
- Review error messages in stderr

## Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## AI Assistant Guidelines

When helping with this project:
1. Follow the established architecture patterns
2. Maintain type safety and strict mode compliance
3. Keep security best practices in mind
4. Update documentation alongside code changes
5. Suggest tests for new functionality
6. Consider backward compatibility
7. Optimize for maintainability over cleverness
