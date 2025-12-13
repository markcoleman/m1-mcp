# Release Process Guide

This document outlines the release process for m1-mcp, including version management, changelog generation, and deployment procedures.

## Release Types

### Semantic Versioning

We follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** (v1.0.0): Breaking changes
- **MINOR** (v0.1.0): New features, backward compatible
- **PATCH** (v0.0.1): Bug fixes, backward compatible

Examples:
- `v0.1.0` → `v0.1.1`: Bug fix
- `v0.1.1` → `v0.2.0`: New feature
- `v0.2.0` → `v1.0.0`: Breaking change

### Pre-release Versions

For testing before official release:

- **Alpha**: `v0.1.0-alpha.1` (early testing)
- **Beta**: `v0.1.0-beta.1` (feature complete, testing)
- **RC**: `v0.1.0-rc.1` (release candidate)

## Release Workflow

### 1. Preparation Phase

**Update Version Number:**
```bash
# For patch release
npm version patch

# For minor release
npm version minor

# For major release
npm version major

# For pre-release
npm version prerelease --preid=beta
```

**Update Changelog:**
```bash
# Manually update CHANGELOG.md with:
# - New features
# - Bug fixes
# - Breaking changes
# - Deprecations
# - Security updates
```

**Final Checks:**
```bash
# Run all tests
npm test

# Build the project
npm run build

# Run security audit
npm audit

# Verify no uncommitted changes
git status
```

### 2. Create Release Tag

```bash
# Commit version bump
git add package.json package-lock.json
git commit -m "chore: bump version to v0.1.1"

# Create and push tag
git tag v0.1.1
git push origin main --tags
```

### 3. Automated Release Process

Once the tag is pushed, GitHub Actions automatically:

1. **Builds the Project**: Compiles TypeScript to JavaScript
2. **Runs Tests**: Validates all functionality
3. **Creates Artifacts**: Packages build output
4. **Generates Changelog**: From git commits since last tag
5. **Creates GitHub Release**: With notes and artifacts
6. **Publishes to npm** (if configured and package is public)

### 4. Post-Release

**Verify Release:**
- Check GitHub Releases page
- Verify artifacts are attached
- Test installation from release

**Announce Release:**
- Update project README if needed
- Post announcement in relevant channels
- Close related GitHub issues

**Monitor:**
- Watch for bug reports
- Monitor error logs
- Check user feedback

## Release Checklist

### Pre-Release

- [ ] All tests passing
- [ ] No security vulnerabilities (npm audit)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version number bumped
- [ ] Breaking changes documented (if any)
- [ ] Migration guide prepared (if breaking changes)

### Release

- [ ] Tag created and pushed
- [ ] GitHub Actions workflow succeeded
- [ ] Release created on GitHub
- [ ] Artifacts uploaded
- [ ] Changelog accurate

### Post-Release

- [ ] Release announcement posted
- [ ] Documentation site updated (if applicable)
- [ ] Related issues closed
- [ ] Next milestone planned

## Emergency Hotfix Process

For critical bugs in production:

### 1. Create Hotfix Branch
```bash
git checkout main
git checkout -b hotfix/critical-bug-fix
```

### 2. Implement Fix
```bash
# Make minimal changes to fix the issue
# Add regression test
npm test
npm run build
```

### 3. Fast-Track Release
```bash
# Bump patch version
npm version patch

# Commit and tag
git commit -am "fix: critical bug in account handling"
git tag v0.1.2

# Merge to main
git checkout main
git merge hotfix/critical-bug-fix

# Push
git push origin main --tags
```

### 4. Monitor
- Watch for successful deployment
- Verify fix in production
- Monitor error rates

## Version Management

### Current Version

Version is managed in `package.json`:
```json
{
  "name": "m1-mcp",
  "version": "0.1.0",
  ...
}
```

### Version History

See [CHANGELOG.md](../CHANGELOG.md) for complete version history.

### Deprecation Policy

When deprecating features:

1. **Announce**: Document in changelog and README
2. **Warning Period**: Maintain for at least one minor version
3. **Remove**: Only in major version updates
4. **Migration Guide**: Provide clear upgrade path

Example:
```
v0.1.0: Feature X introduced
v0.2.0: Feature X deprecated (warnings added)
v0.3.0: Feature X still available (warnings continue)
v1.0.0: Feature X removed (breaking change)
```

## Release Artifacts

### What's Included

Each release includes:

1. **Source Code**: Tagged version on GitHub
2. **Build Output**: Compiled JavaScript in dist/
3. **Tarball**: `m1-mcp-vX.Y.Z.tar.gz` with all necessary files
4. **Documentation**: README, CHANGELOG, LICENSE
5. **Dependencies**: package.json and package-lock.json

### Artifact Structure

```
m1-mcp-v0.1.0.tar.gz
├── dist/              # Compiled JavaScript
├── package.json       # Dependencies and metadata
├── package-lock.json  # Locked dependency versions
├── README.md         # Documentation
└── LICENSE           # License file (if present)
```

## npm Publishing

### Configuration

To publish to npm (if package is made public):

1. Update package.json:
```json
{
  "private": false,  // Remove or set to false
  "publishConfig": {
    "access": "public"
  }
}
```

2. Add npm token to GitHub Secrets:
   - Go to GitHub repository Settings → Secrets
   - Add `NPM_TOKEN` with your npm token

### Automatic Publishing

The release workflow automatically publishes to npm when:
- A version tag is pushed (e.g., `v1.0.0`)
- The tag doesn't contain a hyphen (no pre-releases)
- Package is not marked as private
- NPM_TOKEN secret is configured

### Manual Publishing

If needed, publish manually:
```bash
# Login to npm
npm login

# Publish
npm publish

# Or for public scope
npm publish --access public
```

## Rollback Procedure

If a release has critical issues:

### 1. Quick Mitigation
```bash
# Deprecate the bad version
npm deprecate m1-mcp@0.1.1 "Critical bug, use 0.1.0 or 0.1.2"
```

### 2. Release Fixed Version
```bash
# Fix the issue
# Bump version
npm version patch

# Tag and push
git tag v0.1.2
git push origin main --tags
```

### 3. Communication
- Update GitHub release notes
- Post notice in documentation
- Notify users through appropriate channels

## CI/CD Integration

### GitHub Actions Workflows

#### Release Workflow
- **Trigger**: Push of version tag
- **File**: `.github/workflows/release.yml`
- **Actions**:
  - Build project
  - Run tests
  - Package artifacts
  - Create GitHub release
  - Publish to npm (if configured)

#### CI Workflow
- **Trigger**: Push to main/develop, PRs
- **File**: `.github/workflows/ci.yml`
- **Actions**:
  - Build on multiple Node versions
  - Run tests
  - Security scanning
  - Upload artifacts

### Monitoring Releases

Check release status:
1. Go to repository Actions tab
2. Find the release workflow run
3. Review logs for any issues
4. Verify all steps completed successfully

## Changelog Management

### Format

Follow [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

## [Unreleased]

### Added
- New feature description

### Changed
- Change description

### Deprecated
- Deprecation notice

### Removed
- Removal notice

### Fixed
- Bug fix description

### Security
- Security fix description

## [0.1.1] - 2025-01-15

### Fixed
- Fixed critical bug in account handling
```

### Automation

The release workflow automatically generates a changelog from git commits:
- Commit messages should be clear and descriptive
- Use conventional commit format for better changelogs
- Manual review recommended before release

## Support Policy

### Supported Versions

- **Current**: Latest version receives all updates
- **Previous Minor**: Receives security fixes for 3 months
- **Older**: Not supported, upgrade recommended

### Long-Term Support (LTS)

Currently, no LTS versions are designated. This may change as the project matures.

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

## Questions?

For questions about the release process:
- Open an issue on GitHub
- Contact maintainers
- Review previous releases for examples
