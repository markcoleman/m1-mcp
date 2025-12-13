#!/bin/bash
# Pre-push validation script
# Run this before pushing to ensure your changes will pass CI

set -e

echo "🔍 Running pre-push checks..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must be run from repository root"
  exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo ""
fi

# 1. Check for secrets
echo "1️⃣  Checking for potential secrets in code..."
if git grep -i "password\|secret\|api_key\|token" -- "*.ts" "*.js" "*.json" | grep -v ".github/agents" | grep -v "copilot-instructions" | grep -v "test" | grep -v "example" | grep -v "TODO" | grep -v "description"; then
  echo "❌ Potential secrets found! Review the above matches."
  echo "   Make sure you're not committing real credentials."
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo "✅ No obvious secrets detected"
fi
echo ""

# 2. Install dependencies
echo "2️⃣  Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm ci
else
  echo "✅ Dependencies already installed"
fi
echo ""

# 3. TypeScript compilation
echo "3️⃣  Checking TypeScript compilation..."
npx tsc --noEmit
echo "✅ TypeScript compilation successful"
echo ""

# 4. Build
echo "4️⃣  Building project..."
npm run build
echo "✅ Build successful"
echo ""

# 5. Run tests
echo "5️⃣  Running tests..."
DATA_SOURCE=mock npm test
echo "✅ Tests passed"
echo ""

# 6. Check for npm vulnerabilities
echo "6️⃣  Checking for security vulnerabilities..."
if npm audit --audit-level=high; then
  echo "✅ No high/critical vulnerabilities found"
else
  echo "⚠️  Vulnerabilities found! Review with 'npm audit'"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo ""

# 7. Validate workflow files
echo "7️⃣  Validating GitHub Actions workflows..."
for file in .github/workflows/*.yml; do
  if [ -f "$file" ]; then
    python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null && echo "  ✅ $file" || echo "  ❌ $file (invalid YAML)"
  fi
done
echo ""

# Success!
echo "✅ All checks passed! Ready to push."
echo ""
echo "💡 Tip: The same checks will run in CI when you push."
