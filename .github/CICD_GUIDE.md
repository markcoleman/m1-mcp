# CI/CD Guide

Quick reference for the continuous integration and deployment setup in m1-mcp.

## Overview

The project uses GitHub Actions for automated CI/CD pipelines:

- **CI Pipeline**: Validates every push and pull request
- **Release Pipeline**: Automates releases when version tags are pushed
- **Security Pipeline**: Scans for vulnerabilities continuously

## Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual trigger via GitHub Actions UI

**What It Does:**

1. **Build & Test Job**
   - Tests on Node.js 18.x, 20.x, and 22.x
   - Installs dependencies with `npm ci`
   - Builds the project with `npm run build`
   - Runs tests with `npm test`
   - Validates TypeScript compilation
   - Uploads build artifacts (Node 20.x only)

2. **Lint Job**
   - Checks code formatting (if configured)
   - Runs linter (if configured)
   - Non-blocking (continues on error)

3. **Security Job**
   - Runs `npm audit` for vulnerabilities
   - Generates audit reports
   - Uploads security results as artifacts

**Viewing Results:**
- Go to repository → Actions tab
- Click on the workflow run
- View logs for each job

### Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Push of version tags (e.g., `v1.0.0`, `v0.2.1`)
- Manual trigger with version input

**What It Does:**

1. **Build Job**
   - Builds and tests the release
   - Creates release artifacts (tarball)
   - Uploads artifacts for distribution

2. **Create Release Job**
   - Generates changelog from git commits
   - Creates GitHub Release with notes
   - Attaches build artifacts
   - Adds installation instructions

3. **Publish npm Job** (Optional)
   - Publishes to npm if package is public
   - Requires `NPM_TOKEN` secret
   - Only runs for non-prerelease versions

**Creating a Release:**

```bash
# 1. Update version
npm version patch  # or minor, or major

# 2. Push tag
git push origin main --tags

# 3. GitHub Actions handles the rest!
```

See [RELEASE.md](RELEASE.md) for detailed release process.

### CodeQL Workflow (`.github/workflows/codeql.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly schedule (Mondays at 6 AM UTC)
- Manual trigger

**What It Does:**
- Analyzes JavaScript/TypeScript code for security vulnerabilities
- Uses GitHub's CodeQL engine
- Reports findings in Security tab
- Runs security and quality queries

**Viewing Results:**
- Go to repository → Security tab → Code scanning alerts
- Review and dismiss false positives
- Track remediation of real issues

## Dependabot (`.github/dependabot.yml`)

**What It Does:**
- Weekly checks for dependency updates
- Creates PRs for:
  - npm package updates
  - GitHub Actions updates
  - Devcontainer updates
- Groups minor and patch updates together
- Applies appropriate labels

**Managing Dependabot:**
- Review and merge PRs promptly
- Test updates before merging
- Configure auto-merge for minor updates (optional)

## Local Testing

### Pre-Push Check Script

Run before pushing to catch issues early:

```bash
# Make it executable (first time only)
chmod +x .github/scripts/pre-push-check.sh

# Run the checks
./.github/scripts/pre-push-check.sh
```

This script runs the same checks as CI:
- TypeScript compilation
- Build
- Tests
- Security audit
- Workflow validation

### Manual Testing

```bash
# Build
npm run build

# Run tests
npm test

# Check types
npx tsc --noEmit

# Security audit
npm audit

# Test with different Node versions (using nvm)
nvm use 18 && npm test
nvm use 20 && npm test
nvm use 22 && npm test
```

## Monitoring

### CI Status

**Check Status:**
- Green checkmark ✅: All checks passed
- Red X ❌: Some checks failed
- Yellow dot 🟡: Checks in progress

**If CI Fails:**

1. Click on the failed workflow
2. Review the logs for the failing job
3. Fix the issue locally
4. Push the fix
5. CI runs again automatically

**Common Failures:**

- **Build Failure**: TypeScript errors or missing dependencies
  - Fix: Ensure code compiles locally
- **Test Failure**: Tests don't pass
  - Fix: Run tests locally and fix
- **Security Issues**: Vulnerabilities in dependencies
  - Fix: Run `npm audit fix` and test
- **Workflow Syntax**: Invalid YAML
  - Fix: Validate YAML syntax

### Security Alerts

**Where to Find:**
- Repository → Security tab
- Dependabot alerts for dependencies
- CodeQL alerts for code issues

**Responding to Alerts:**

1. Review the alert details
2. Assess the severity and impact
3. Follow remediation guidance
4. Test the fix
5. Mark as resolved or dismissed

## Best Practices

### Pull Requests

- CI must pass before merging
- Review security alerts before merging
- Update documentation with code changes
- Keep PRs focused and reviewable

### Releases

- Test thoroughly before tagging
- Update CHANGELOG.md before release
- Use semantic versioning
- Announce releases to users

### Security

- Never commit secrets or tokens
- Rotate credentials regularly
- Update dependencies weekly
- Review security alerts promptly

### Performance

- Keep workflow files efficient
- Cache dependencies where possible
- Run expensive checks only when needed
- Use matrix builds for multiple versions

## Troubleshooting

### Workflow Not Triggering

**Problem**: Workflow doesn't run on push

**Solutions:**
- Check workflow file syntax
- Verify branch names match triggers
- Check if workflows are enabled in settings
- Review workflow permissions

### Build Failing on CI but Works Locally

**Problem**: "Works on my machine"

**Common Causes:**
- Different Node.js versions
- Missing environment variables
- Platform-specific code
- Uncommitted files

**Solutions:**
```bash
# Test with CI Node version
nvm use 20
npm ci  # Use ci instead of install
npm test

# Check for uncommitted files
git status

# Verify .gitignore
git check-ignore -v <file>
```

### Secrets Not Available

**Problem**: Workflow can't access secrets

**Solutions:**
- Add secrets in Settings → Secrets → Actions
- Use correct secret name in workflow
- Check secret scope (repository vs environment)
- Verify workflow permissions

### Rate Limiting

**Problem**: GitHub API rate limits exceeded

**Solutions:**
- Use `GITHUB_TOKEN` for authenticated requests
- Add delays between API calls
- Cache responses when possible
- Use workflow concurrency controls

## Configuration

### Adding a New Workflow

1. Create file in `.github/workflows/`
2. Use existing workflows as template
3. Test with workflow_dispatch trigger
4. Add appropriate documentation
5. Commit and push

### Modifying Existing Workflows

1. Edit workflow file
2. Validate YAML syntax
3. Test with pull request
4. Document changes
5. Monitor first runs

### Workflow Secrets

**Add Secrets:**
1. Go to Settings → Secrets → Actions
2. Click "New repository secret"
3. Enter name and value
4. Use in workflow: `${{ secrets.SECRET_NAME }}`

**Required Secrets:**
- `NPM_TOKEN`: For npm publishing (optional)

**Best Practices:**
- Use descriptive names
- Document required secrets
- Rotate secrets regularly
- Use environment-specific secrets

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

## Support

For CI/CD issues:
- Check workflow logs first
- Review this guide
- Search GitHub Actions documentation
- Open an issue with workflow logs
- Contact repository maintainers

---

**Last Updated**: 2025-01-15
**Maintained By**: Repository maintainers
