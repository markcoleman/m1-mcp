# Documentation Agent Instructions

## Purpose
Guide the creation and maintenance of high-quality documentation for the m1-mcp project, ensuring clarity, accuracy, and completeness.

## Documentation Philosophy

### Core Principles
1. **User-Centric**: Write for the reader, not the writer
2. **Accurate**: Keep docs in sync with code
3. **Complete**: Cover all features and use cases
4. **Clear**: Use simple language and examples
5. **Discoverable**: Organize for easy navigation
6. **Maintainable**: Structure for easy updates

### Documentation Types

1. **README.md**: Overview, quick start, API reference
2. **CONTRIBUTING.md**: Developer guidelines
3. **SECURITY.md**: Security policies and practices
4. **CHANGELOG.md**: Version history and changes
5. **QUICKSTART.md**: Getting started guide
6. **Code Comments**: In-code documentation
7. **Agent Guides**: Specialized development guides

## Documentation Structure

### README.md

**Purpose**: First impression and primary reference

**Required Sections:**
- Project description
- Architecture overview
- Features and tools
- Prerequisites
- Installation
- Configuration
- Usage examples
- Contributing link
- License

**Best Practices:**
```markdown
# Project Name

Brief, clear description of what the project does.

## Quick Start

# Minimal example to get running
npm install
npm run build
npm start


## Features

- Feature 1: Clear description
- Feature 2: Clear description

## Documentation

For detailed guides, see:
- [Quick Start](QUICKSTART.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
```

### CONTRIBUTING.md

**Purpose**: Guide contributors

**Required Sections:**
- Development setup
- Project structure
- Development workflow
- Testing guidelines
- Code style
- Pull request process
- CI/CD information

**Best Practices:**
- Step-by-step instructions
- Include example commands
- Link to relevant resources
- Explain project-specific conventions
- Describe CI/CD process

### Code Comments

**When to Comment:**
- Complex algorithms
- Non-obvious decisions
- Security considerations
- Performance optimizations
- Workarounds for external issues
- Public API documentation

**When NOT to Comment:**
- Obvious code (let code speak)
- Redundant information
- Outdated information
- Personal notes (use TODOs instead)

**Examples:**

✅ **Good Comments:**
```typescript
/**
 * Fetches account transactions with caching and retry logic.
 * 
 * @param accountId - The account identifier
 * @param options - Filter options for transactions
 * @returns Promise resolving to array of transactions
 * @throws {Error} If account not found or API error
 * 
 * Note: Results are cached for 30 seconds to reduce API calls.
 * The Members1st API has a rate limit of 100 requests/minute.
 */
async function fetchTransactions(
  accountId: string,
  options: TransactionOptions
): Promise<Transaction[]> {
  // Implementation
}

// Security: Validate accountId to prevent injection attacks
const validatedId = AccountIdSchema.parse(accountId);

// Workaround: Members1st API returns dates in EST, convert to UTC
const utcDate = convertESTtoUTC(transaction.date);
```

❌ **Bad Comments:**
```typescript
// This function gets transactions
function getTransactions() {
  // Loop through accounts
  for (const account of accounts) {
    // Get the ID
    const id = account.id;
    // Return it
    return id;
  }
}

// TODO: Fix this later
// This is broken
// I don't know why this works
```

### JSDoc for Public APIs

**Format:**
```typescript
/**
 * One-line summary of the function.
 * 
 * Detailed description if needed. Can span multiple lines
 * and include examples or important notes.
 * 
 * @param paramName - Description of parameter
 * @param optionalParam - Description of optional parameter
 * @returns Description of return value
 * @throws {ErrorType} When and why error is thrown
 * 
 * @example
 * ```typescript
 * const result = await functionName('param', { option: true });
 * console.log(result);
 * ```
 * 
 * @see RelatedFunction for related functionality
 * @since 0.1.0
 */
```

**Example:**
```typescript
/**
 * Retrieves account details by account ID.
 * 
 * Fetches detailed information for a specific account from the
 * configured data source (mock or Members1st). Returns account
 * balance, type, and metadata.
 * 
 * @param accountId - The unique account identifier (e.g., 'acct_001')
 * @returns Promise resolving to Account object or undefined if not found
 * @throws {ValidationError} If accountId format is invalid
 * @throws {APIError} If external API request fails
 * 
 * @example
 * ```typescript
 * const account = await getAccountById('acct_001');
 * if (account) {
 *   console.log(`Balance: ${account.balance}`);
 * }
 * ```
 * 
 * @see getAllAccounts for retrieving all accounts
 * @since 0.1.0
 */
export async function getAccountById(
  accountId: string
): Promise<Account | undefined> {
  // Implementation
}
```

## Documentation Workflow

### When Adding a Feature

1. **Plan Documentation First:**
   - What does this feature do?
   - Who will use it?
   - What examples are needed?

2. **Document as You Code:**
   - Add JSDoc to public functions
   - Update README if user-facing
   - Add examples to docs
   - Update CHANGELOG

3. **Review Before Committing:**
   - Does README reflect new feature?
   - Are examples tested and working?
   - Is configuration documented?
   - Are breaking changes noted?

### When Fixing a Bug

1. **Update Affected Docs:**
   - Correct any inaccurate information
   - Add notes about fixed behavior
   - Update examples if needed

2. **Document in CHANGELOG:**
   ```markdown
   ### Fixed
   - Fixed incorrect transaction date handling (#123)
   ```

3. **Add Comments if Needed:**
   - Explain non-obvious fix
   - Document edge case handling

### When Making Breaking Changes

1. **Document Thoroughly:**
   - What changed and why
   - Migration path
   - Code examples for both old and new way
   - Deprecation timeline

2. **Update All Affected Docs:**
   - README usage examples
   - CONTRIBUTING if workflow changes
   - CHANGELOG with clear breaking change notice
   - Code comments marking deprecated code

3. **Migration Guide:**
   ```markdown
   ## Migrating from v0.1.x to v0.2.0
   
   ### Breaking Change: Tool Schema Updates
   
   **Old Way:**
   ```json
   { "account_id": "123" }
   ```
   
   **New Way:**
   ```json
   { "accountId": "123" }
   ```
   
   **Migration Steps:**
   1. Update all tool calls to use camelCase
   2. Test with new schema
   3. Remove old code
   ```

## Documentation Quality Checklist

### Content Quality
- [ ] Accurate and up-to-date
- [ ] Clear and concise
- [ ] Includes working examples
- [ ] Covers common use cases
- [ ] Explains error handling
- [ ] Links to related docs

### Technical Quality
- [ ] Code examples are tested
- [ ] Syntax highlighting correct
- [ ] Commands work as written
- [ ] Version numbers accurate
- [ ] File paths correct

### Organization
- [ ] Logical flow and structure
- [ ] Easy to navigate
- [ ] Table of contents for long docs
- [ ] Clear headings and sections
- [ ] Internal links work

### Accessibility
- [ ] Plain language used
- [ ] Technical terms defined
- [ ] Alt text for images
- [ ] Code blocks have language tags
- [ ] Consistent formatting

## Writing Style Guide

### Voice and Tone
- Use active voice: "Run the command" not "The command should be run"
- Be direct: "Install npm" not "You might want to install npm"
- Be encouraging: "You can customize..." not "Users are allowed to..."
- Be specific: "Set timeout to 30 seconds" not "Set appropriate timeout"

### Formatting

**Commands:**
```bash
# Use code blocks with language
npm install
```

**File Paths:**
Use inline code: `src/server.ts`

**Variables:**
Use angle brackets for placeholders: `<accountId>`

**Environment Variables:**
Use UPPER_SNAKE_CASE: `DATA_SOURCE`

**Emphasis:**
- *Italic* for terms and light emphasis
- **Bold** for strong emphasis and important points
- `Code` for code, commands, and file names

### Example Structure

```markdown
## Feature Name

Brief description of what this feature does.

### Usage

Basic usage example:

# Command or code example
npm run feature


### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `name` | string | Option description | `default` |

### Examples

#### Basic Example

Description of basic use case.

# Code example
const result = example();


#### Advanced Example

Description of advanced use case.

# Code example with explanation
const result = advancedExample({
  option1: true,
  option2: 'value'
});
```

## Maintaining Documentation

### Regular Reviews
- Review docs quarterly
- Update for new releases
- Fix broken links
- Update screenshots if UI changes
- Verify all examples still work

### Version Documentation
- Tag docs with version numbers
- Maintain docs for supported versions
- Archive old version docs
- Link to version-specific docs

### Metrics to Track
- Documentation coverage
- Outdated sections
- Frequently asked questions
- Common issues
- User feedback

## Tools and Resources

### Markdown Tools
- Markdown linter for consistency
- Link checker for broken links
- Spell checker for typos
- Table generator for tables

### References
- [GitHub Markdown Guide](https://guides.github.com/features/mastering-markdown/)
- [Markdown Cheatsheet](https://www.markdownguide.org/cheat-sheet/)
- [Writing Good Documentation](https://www.writethedocs.org/guide/)

### Templates

**New Feature Documentation Template:**
```markdown
## [Feature Name]

One-line description of feature.

### Overview

Detailed description of what the feature does and why it's useful.

### Usage

Basic usage instructions with code example.

### Configuration

Any environment variables or configuration needed.

### Examples

Multiple examples covering common use cases.

### Error Handling

Common errors and how to resolve them.

### See Also

Links to related features or documentation.
```

## Documentation Anti-Patterns

### ❌ Avoid These Mistakes

1. **Outdated Examples:**
   - Always test examples before committing
   - Update examples when APIs change

2. **Missing Context:**
   - Don't assume prior knowledge
   - Explain prerequisites

3. **Too Much/Too Little:**
   - Balance detail with brevity
   - Link to details rather than repeating

4. **Unclear Structure:**
   - Use clear headings
   - Group related content
   - Add table of contents for long docs

5. **Broken Links:**
   - Test all links
   - Use relative paths for internal links
   - Check external links periodically

## Documentation Checklist for PRs

Before submitting a PR with code changes:

- [ ] README updated if user-visible changes
- [ ] CHANGELOG updated with change
- [ ] Code comments added for complex logic
- [ ] JSDoc added for new public APIs
- [ ] Examples tested and working
- [ ] CONTRIBUTING updated if workflow changes
- [ ] Environment variables documented
- [ ] Migration guide if breaking changes
- [ ] Security implications documented
- [ ] All docs follow style guide

## Getting Help

- Review existing docs for examples
- Ask for doc review in PRs
- Consult writing resources
- Request feedback from users
- Use templates provided
