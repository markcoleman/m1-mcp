# GitHub Copilot Agent Instructions

This directory contains specialized instruction files for GitHub Copilot and other AI coding assistants working on the m1-mcp project.

## Purpose

These agent guides provide context-specific instructions for different development tasks, ensuring consistent, high-quality contributions across various scenarios.

## Available Agents

### 1. Code Review (`code-review.md`)
**When to Use**: Reviewing pull requests and code changes

**Covers:**
- Code quality checklist
- Security review points
- Architecture validation
- Testing verification
- Documentation checks
- Approval criteria

### 2. Testing (`testing.md`)
**When to Use**: Writing or improving tests

**Covers:**
- Test strategy and patterns
- Unit and integration testing
- Test data management
- Running and debugging tests
- Quality metrics
- CI integration

### 3. Feature Development (`feature-development.md`)
**When to Use**: Building new features

**Covers:**
- Feature workflow (planning to deployment)
- Adding MCP tools
- Adding data sources
- Configuration management
- Best practices and patterns
- Feature checklist

### 4. Bug Fixing (`bug-fixing.md`)
**When to Use**: Diagnosing and fixing bugs

**Covers:**
- Bug fix workflow
- Common bug categories
- Debugging techniques
- Root cause analysis
- Regression testing
- Documentation requirements

### 5. Security (`security.md`)
**When to Use**: Addressing security concerns

**Covers:**
- Security principles
- Vulnerability patterns and fixes
- Input validation
- Secrets management
- API security
- Incident response

### 6. Documentation (`documentation.md`)
**When to Use**: Writing or updating documentation

**Covers:**
- Documentation philosophy
- Writing guidelines
- Code comments and JSDoc
- Markdown formatting
- Maintenance practices
- Quality checklist

## How to Use

### For GitHub Copilot

GitHub Copilot automatically reads the main `.github/copilot-instructions.md` file. These agent files provide additional context for specific tasks.

**Reference in prompts:**
```
@workspace Review this PR following the code-review agent guidelines
```

### For AI Assistants

When working on specific tasks, reference the relevant agent guide:

```
I'm implementing a new feature. Please follow the guidelines in 
.github/agents/feature-development.md
```

### For Developers

Use these guides as reference material:
- Read before starting a task
- Use as checklists during development
- Reference in code reviews
- Update based on lessons learned

## Guide Structure

Each agent guide follows a consistent structure:

1. **Purpose**: What the guide covers
2. **Workflow/Process**: Step-by-step instructions
3. **Patterns/Examples**: Code examples and patterns
4. **Best Practices**: Dos and don'ts
5. **Checklists**: Validation checkpoints
6. **Resources**: Additional references

## Updating Guides

### When to Update

- New patterns emerge
- Project conventions change
- Common issues identified
- Tools or processes updated
- Best practices evolve

### How to Update

1. Create a branch for documentation updates
2. Edit the relevant agent guide(s)
3. Test examples and commands
4. Update the main copilot-instructions.md if needed
5. Submit a pull request
6. Request review from maintainers

### Consistency Guidelines

When updating guides:
- Maintain consistent formatting
- Use working code examples
- Test all commands
- Link to related documentation
- Keep language clear and concise

## Integration with CI/CD

These guides complement the automated CI/CD pipelines:

- **CI Workflows**: Automated checks match guide recommendations
- **Pre-Push Script**: Validates many checklist items
- **Code Review**: Automated and manual review use same criteria
- **Security Scanning**: CodeQL aligns with security guide

## Project-Specific Context

All guides are tailored for m1-mcp:

- **MCP Protocol**: Server implementation patterns
- **TypeScript**: Strict mode and type safety
- **Data Abstraction**: Mock and Members1st backends
- **Tool Handlers**: MCP tool development
- **Environment Config**: Secret management

## Best Practices for Using Agents

### 1. Read Before Acting

Understand the guide before starting work:
```
# ✅ Good
Read feature-development.md → Plan → Implement

# ❌ Bad
Start coding → Realize you missed steps → Rework
```

### 2. Use as Checklists

Follow the checklists at each stage:
- During implementation
- Before committing
- Before submitting PR
- After receiving feedback

### 3. Adapt to Context

Guides are recommendations, not rigid rules:
- Apply judgment
- Consider project state
- Balance ideals with pragmatism
- Discuss deviations in PRs

### 4. Provide Feedback

Help improve the guides:
- Report unclear sections
- Suggest missing topics
- Share successful patterns
- Document common issues

## Examples

### Using Multiple Guides

**Feature with Security Implications:**
1. Start with `feature-development.md` for structure
2. Reference `security.md` for validation patterns
3. Use `testing.md` for test coverage
4. Apply `documentation.md` for docs
5. Follow `code-review.md` for self-review

**Bug Fix:**
1. Use `bug-fixing.md` for systematic diagnosis
2. Reference `testing.md` for regression tests
3. Check `security.md` if security-related
4. Update `documentation.md` if docs affected

### AI Assistant Prompts

**Effective Prompts:**
```
Create a new MCP tool following .github/agents/feature-development.md,
ensuring security best practices from .github/agents/security.md
```

```
Review this PR using the code-review.md checklist and highlight
any security concerns from security.md
```

**Less Effective:**
```
Make this code better
```

## Maintenance

### Regular Reviews

- **Quarterly**: Review all guides for accuracy
- **After Major Changes**: Update affected guides
- **On Feedback**: Address user comments
- **Version Updates**: Align with new dependencies

### Metrics to Track

- Usage patterns
- Common questions
- Deviation frequency
- Contribution quality
- Issue resolution time

## Related Documentation

- **Main Copilot Instructions**: `../.github/copilot-instructions.md`
- **Contributing Guide**: `../../CONTRIBUTING.md`
- **Security Policy**: `../../SECURITY.md`
- **Release Process**: `../RELEASE.md`
- **CI/CD Guide**: `../CICD_GUIDE.md`

## Contact

For questions or suggestions about agent guides:
- Open an issue on GitHub
- Submit a PR with improvements
- Discuss in pull request comments
- Contact repository maintainers

---

**Remember**: These guides enhance AI assistance and human development. Use them as tools to improve code quality, consistency, and efficiency across the project.
