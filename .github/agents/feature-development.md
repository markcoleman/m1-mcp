# Feature Development Agent Instructions

## Purpose
Guide the development of new features in the m1-mcp project, ensuring consistency with existing architecture and best practices.

## Feature Development Workflow

### 1. Planning Phase
- [ ] Understand the feature requirements clearly
- [ ] Review existing codebase for similar patterns
- [ ] Identify affected components and layers
- [ ] Plan backward compatibility strategy
- [ ] Estimate testing requirements
- [ ] Document design decisions

### 2. Design Phase
- [ ] Define data models and types
- [ ] Design API interfaces (tool schemas)
- [ ] Plan error handling strategy
- [ ] Consider security implications
- [ ] Design for testability
- [ ] Review with architecture patterns

### 3. Implementation Phase
- [ ] Create feature branch from main
- [ ] Implement in small, reviewable commits
- [ ] Write tests alongside code
- [ ] Update documentation as you go
- [ ] Test both data sources (mock and Members1st)
- [ ] Handle edge cases and errors

### 4. Testing Phase
- [ ] Unit tests for new functions
- [ ] Integration tests for complete flows
- [ ] Manual testing with both transports
- [ ] Test error scenarios
- [ ] Performance testing if needed
- [ ] Security review

### 5. Documentation Phase
- [ ] Update README.md
- [ ] Update CONTRIBUTING.md if needed
- [ ] Update .env.example for new variables
- [ ] Add code comments for complex logic
- [ ] Create usage examples
- [ ] Update architecture diagrams if needed

## Feature Types and Patterns

### Adding a New MCP Tool

#### Step 1: Define the Schema (tools.ts)
```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define input schema with clear descriptions
const GetNewFeatureInputSchema = z.object({
  requiredParam: z.string().describe("Description of required parameter"),
  optionalParam: z.number().optional().describe("Description of optional parameter"),
  enumParam: z.enum(["option1", "option2"]).optional().describe("Choose from available options")
});

type GetNewFeatureInput = z.infer<typeof GetNewFeatureInputSchema>;
```

#### Step 2: Implement the Handler (tools.ts)
```typescript
async function handleGetNewFeature(args: GetNewFeatureInput) {
  try {
    // Validate input (Zod already validated, but double-check business rules)
    if (args.requiredParam.length === 0) {
      return {
        error: {
          code: "INVALID_INPUT",
          message: "Required parameter cannot be empty"
        }
      };
    }

    // Call data layer
    const data = await getDataForNewFeature(args);

    // Return structured response
    return {
      result: data,
      metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0"
      }
    };
  } catch (error) {
    console.error("[handleGetNewFeature] Error:", error);
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }
    };
  }
}
```

#### Step 3: Register the Tool (tools.ts)
```typescript
export const toolsList = [
  // ... existing tools
  {
    name: "get_new_feature",
    description: "Clear, concise description of what this tool does and when to use it",
    inputSchema: zodToJsonSchema(GetNewFeatureInputSchema, "GetNewFeatureInput")
  }
];

// Add to handler switch
export async function handleToolCall(name: string, args: unknown) {
  switch (name) {
    // ... existing cases
    case "get_new_feature":
      const parsedArgs = GetNewFeatureInputSchema.parse(args);
      return await handleGetNewFeature(parsedArgs);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

#### Step 4: Add Data Layer Support (data.ts)
```typescript
export async function getDataForNewFeature(params: NewFeatureParams): Promise<NewFeatureData> {
  const dataSource = process.env.DATA_SOURCE || "mock";

  if (dataSource === "members1st") {
    // Implement Members1st integration
    return await fetchMembers1stNewFeature(params);
  }

  // Default mock implementation
  return getMockNewFeatureData(params);
}

// Mock implementation
function getMockNewFeatureData(params: NewFeatureParams): NewFeatureData {
  return {
    id: "mock_001",
    data: "Mock data for testing",
    params: params
  };
}
```

#### Step 5: Add Tests (test-harness.ts)
```typescript
async function testGetNewFeature() {
  console.log("\n=== Testing get_new_feature ===");

  // Test 1: Valid input
  try {
    const result = await handleToolCall("get_new_feature", {
      requiredParam: "test",
      optionalParam: 42
    });
    console.log("✓ Valid input test passed");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("✗ Valid input test failed:", error);
  }

  // Test 2: Missing required param
  try {
    const result = await handleToolCall("get_new_feature", {
      optionalParam: 42
    });
    console.log("✗ Should have failed validation");
  } catch (error) {
    console.log("✓ Validation test passed (correctly rejected invalid input)");
  }

  // Test 3: Error handling
  // Add tests for edge cases and error scenarios
}
```

#### Step 6: Update Documentation
```markdown
### `get_new_feature`

Description of the new tool and its purpose.

**Input:**
```json
{
  "requiredParam": "value",
  "optionalParam": 42
}
```

**Output:**
```json
{
  "result": {
    "id": "...",
    "data": "..."
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Adding a New Data Source

#### Step 1: Create Integration File
Create `src/newsource.ts`:
```typescript
interface NewsourceConfig {
  apiUrl: string;
  apiKey: string;
  // Other config
}

function getNewsourceConfig(): NewsourceConfig {
  return {
    apiUrl: process.env.NEWSOURCE_API_URL || "https://api.newsource.com",
    apiKey: process.env.NEWSOURCE_API_KEY || "",
  };
}

export async function fetchNewsourceAccounts(): Promise<Account[]> {
  const config = getNewsourceConfig();
  
  try {
    const response = await fetch(`${config.apiUrl}/accounts`, {
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return transformNewsourceAccounts(data);
  } catch (error) {
    console.error("[fetchNewsourceAccounts] Error:", error);
    throw error;
  }
}

function transformNewsourceAccounts(data: any): Account[] {
  // Transform external API format to internal format
  return data.accounts.map((acc: any) => ({
    id: acc.account_id,
    name: acc.account_name,
    type: acc.type.toLowerCase(),
    currency: acc.currency,
    balance: parseFloat(acc.balance)
  }));
}
```

#### Step 2: Integrate in Data Layer (data.ts)
```typescript
import { fetchNewsourceAccounts } from "./newsource.js";

export async function getAllAccounts(): Promise<Account[]> {
  const dataSource = process.env.DATA_SOURCE || "mock";

  switch (dataSource) {
    case "members1st":
      return await fetchMembers1stAccounts();
    case "newsource":
      return await fetchNewsourceAccounts();
    default:
      return mockAccounts;
  }
}
```

#### Step 3: Add Configuration (.env.example)
```bash
# Newsource Integration
# Set DATA_SOURCE=newsource to use Newsource backend
NEWSOURCE_API_URL=https://api.newsource.com
NEWSOURCE_API_KEY=your_api_key_here
```

### Adding Configuration Options

#### Step 1: Define in env.ts
```typescript
export interface Config {
  // ... existing config
  newFeature: {
    enabled: boolean;
    option1: string;
    option2: number;
  };
}

export function loadConfig(): Config {
  return {
    // ... existing config
    newFeature: {
      enabled: process.env.NEW_FEATURE_ENABLED === "true",
      option1: process.env.NEW_FEATURE_OPTION1 || "default",
      option2: parseInt(process.env.NEW_FEATURE_OPTION2 || "100")
    }
  };
}
```

#### Step 2: Document in .env.example
```bash
# New Feature Configuration
NEW_FEATURE_ENABLED=false
NEW_FEATURE_OPTION1=default_value
NEW_FEATURE_OPTION2=100
```

## Best Practices for Features

### Code Organization
- Keep related code together
- One file per major component
- Export only what's needed
- Use barrel exports for convenience

### Type Safety
```typescript
// ✅ Good: Explicit types
interface UserData {
  id: string;
  name: string;
  email: string;
}

function processUser(data: UserData): Result {
  // Implementation
}

// ❌ Bad: Using any
function processUser(data: any) {
  // Implementation
}
```

### Error Handling
```typescript
// ✅ Good: Structured errors
return {
  error: {
    code: "VALIDATION_ERROR",
    message: "Account ID must be a non-empty string",
    details: { provided: accountId }
  }
};

// ❌ Bad: Generic errors
throw new Error("Invalid input");
```

### Validation
```typescript
// ✅ Good: Using Zod schemas
const schema = z.object({
  id: z.string().min(1),
  amount: z.number().positive()
});

const validated = schema.parse(input);

// ❌ Bad: Manual validation
if (!input.id || typeof input.amount !== 'number') {
  throw new Error("Invalid input");
}
```

### Async/Await
```typescript
// ✅ Good: Proper error handling
async function fetchData() {
  try {
    const data = await apiCall();
    return processData(data);
  } catch (error) {
    console.error("Fetch error:", error);
    throw new Error("Failed to fetch data");
  }
}

// ❌ Bad: Unhandled rejections
async function fetchData() {
  const data = await apiCall(); // Could throw
  return processData(data);
}
```

## Feature Checklist

Before submitting a PR:
- [ ] Feature implemented according to requirements
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Code follows project style
- [ ] No hardcoded values or secrets
- [ ] Error handling implemented
- [ ] Backward compatible or migration path provided
- [ ] Works with both mock and real data sources
- [ ] Works with both stdio and HTTP transports
- [ ] Performance is acceptable
- [ ] Security review completed
- [ ] Ready for code review

## Common Pitfalls to Avoid

1. **Breaking Existing API**: Always maintain backward compatibility
2. **Ignoring Errors**: Every async operation needs error handling
3. **Logging to stdout**: Use stderr for logs to avoid MCP pollution
4. **Hardcoding Values**: Use environment variables for configuration
5. **Missing Validation**: Always validate external inputs
6. **Poor Type Safety**: Avoid `any`, use proper types
7. **Incomplete Testing**: Test happy path, errors, and edge cases
8. **Forgetting Documentation**: Update docs as you code, not after

## Getting Help

- Review similar existing features in the codebase
- Check CONTRIBUTING.md for development guidelines
- Refer to architecture diagrams in README.md
- Ask questions in pull request discussions
- Review closed PRs for examples
