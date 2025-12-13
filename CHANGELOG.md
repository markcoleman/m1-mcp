# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI/CD workflows
  - CI pipeline for build, test, and security scanning
  - Release pipeline for automated releases
  - CodeQL security analysis workflow
- Enhanced Dependabot configuration
  - npm dependency updates
  - GitHub Actions updates
  - Grouped minor and patch updates
- Comprehensive Copilot assets
  - Main Copilot instructions in `.github/copilot-instructions.md`
  - Specialized agent guides for code review, testing, feature development, bug fixing, and security
- Security documentation in `SECURITY.md`
- Release process documentation in `.github/RELEASE.md`
- CI/CD documentation in README.md and CONTRIBUTING.md

### Changed
- Updated CONTRIBUTING.md with CI/CD pipeline information
- Enhanced README.md with CI/CD and automation section

## [0.1.0] - 2025-01-13

### Added
- Initial release of m1-mcp
- MCP (Model Context Protocol) server implementation
- Support for stdio and HTTP transports
- Three core tools:
  - `get_all_accounts`: List all accounts
  - `get_account_details`: Get account by ID
  - `get_account_transactions`: Get transactions with filters
- Mock data source for testing
- Members 1st API integration
- TypeScript with strict mode
- Environment-based configuration
- Basic test harness
- Development and production scripts
- Documentation (README, CONTRIBUTING, QUICKSTART)
- Example configuration files

### Features
- Data abstraction layer supporting multiple backends
- Zod schema validation for inputs
- Structured error handling
- Account caching for Members 1st API
- Flexible transaction filtering
- HTTP transport with SSE support
- Environment variable validation

[Unreleased]: https://github.com/markcoleman/m1-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/markcoleman/m1-mcp/releases/tag/v0.1.0
