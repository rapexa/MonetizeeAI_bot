#!/bin/bash

# Backend verification script for MonetizeeAI Bot
# This script verifies Go code formatting, tests, and build
# Exit code: 0 = success, non-zero = failure

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Backend Verification"
echo "=========================================="
echo ""

# Check if go.mod exists
if [ ! -f "go.mod" ]; then
    echo -e "${RED}❌ go.mod not found in project root${NC}"
    exit 1
fi

# Check Go installation
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is not installed or not in PATH${NC}"
    exit 1
fi

GO_VERSION=$(go version)
echo -e "${YELLOW}ℹ️  Go version: $GO_VERSION${NC}"
echo ""

# Format check (NON-MUTATING: use gofmt -l to list files that need formatting)
echo -e "${YELLOW}ℹ️  Checking Go code formatting...${NC}"
UNFORMATTED=$(gofmt -l . 2>/dev/null || true)
if [ -n "$UNFORMATTED" ]; then
    echo -e "${RED}❌ Go code is not properly formatted. Run: go fmt ./...${NC}"
    echo "Files needing formatting:"
    echo "$UNFORMATTED"
    exit 1
else
    echo -e "${GREEN}✅ Go code formatting check passed${NC}"
fi
echo ""

# Run tests (APP_ENV=test so .env is optional and init skips DB/Groq)
echo -e "${YELLOW}ℹ️  Running Go tests...${NC}"
if APP_ENV=test go test ./... -v; then
    echo -e "${GREEN}✅ Go tests passed${NC}"
else
    echo -e "${RED}❌ Go tests failed${NC}"
    exit 1
fi
echo ""

# Build check
echo -e "${YELLOW}ℹ️  Building backend...${NC}"
if go build -o /tmp/bot_test .; then
    echo -e "${GREEN}✅ Backend build successful${NC}"
    rm -f /tmp/bot_test
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}✅ All backend checks passed!${NC}"
exit 0
