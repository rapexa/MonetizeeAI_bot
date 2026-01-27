#!/bin/bash

# Verify script for MonetizeeAI Bot
# This script verifies both frontend and backend before deployment
# Exit code: 0 = success, non-zero = failure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
    FAILURES=$((FAILURES + 1))
}

# Function to print info
info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

echo "=========================================="
echo "MonetizeeAI Bot - Verification Script"
echo "=========================================="
echo ""

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# ============================================
# FRONTEND VERIFICATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Frontend Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FRONTEND_DIR="$PROJECT_ROOT/miniApp"

if [ ! -d "$FRONTEND_DIR" ]; then
    error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    error "package.json not found in frontend directory"
    exit 1
fi

info "Frontend directory: $FRONTEND_DIR"

# Install dependencies (if needed)
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    info "Installing frontend dependencies..."
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    if [ $? -eq 0 ]; then
        success "Frontend dependencies installed"
    else
        error "Failed to install frontend dependencies"
        exit 1
    fi
else
    info "Frontend dependencies already installed"
fi

# Run lint
info "Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    success "ESLint passed"
else
    error "ESLint failed"
    npm run lint  # Show errors
fi

# Run type-check
info "Running TypeScript type check..."
if npm run type-check > /dev/null 2>&1; then
    success "TypeScript type check passed"
else
    error "TypeScript type check failed"
    npm run type-check  # Show errors
fi

# Run build
info "Building frontend..."
if npm run build > /dev/null 2>&1; then
    success "Frontend build successful"
else
    error "Frontend build failed"
    npm run build  # Show errors
fi

echo ""

# ============================================
# BACKEND VERIFICATION
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_ROOT"

# Check if go.mod exists
if [ ! -f "go.mod" ]; then
    error "go.mod not found in project root"
    exit 1
fi

info "Backend directory: $PROJECT_ROOT"

# Check Go version
info "Checking Go installation..."
if ! command -v go &> /dev/null; then
    error "Go is not installed or not in PATH"
    exit 1
fi
GO_VERSION=$(go version)
info "Go version: $GO_VERSION"

# Format check (NON-MUTATING: use gofmt -l to list files that need formatting)
info "Checking Go code formatting..."
UNFORMATTED=$(gofmt -l . 2>/dev/null || true)
if [ -n "$UNFORMATTED" ]; then
    error "Go code is not properly formatted. Run: go fmt ./..."
    echo "Files needing formatting:"
    echo "$UNFORMATTED"
else
    success "Go code formatting check passed"
fi

# Run tests
info "Running Go tests..."
if go test ./... -v > /tmp/go_test_output.log 2>&1; then
    success "Go tests passed"
else
    error "Go tests failed"
    cat /tmp/go_test_output.log
fi

# Build check
info "Building backend..."
if go build -o /tmp/bot_test . > /tmp/go_build_output.log 2>&1; then
    success "Backend build successful"
    rm -f /tmp/bot_test
else
    error "Backend build failed"
    cat /tmp/go_build_output.log
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Verification failed with $FAILURES error(s)${NC}"
    echo ""
    exit 1
fi
