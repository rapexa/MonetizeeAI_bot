#!/bin/bash

# Safe deployment script for MonetizeeAI Bot
# This script automates the current manual deployment process
# Supports DRY_RUN mode for testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DRY_RUN="${DRY_RUN:-0}"
BACKEND_BINARY_NAME="bot"
FRONTEND_BUILD_DIR="miniApp/dist"
BACKEND_BUILD_DIR="."

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to execute command (respects DRY_RUN)
execute() {
    if [ "$DRY_RUN" = "1" ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} $*"
    else
        "$@"
    fi
}

echo "=========================================="
echo "MonetizeeAI Bot - Deployment Script"
echo "=========================================="
echo ""

if [ "$DRY_RUN" = "1" ]; then
    warning "DRY RUN MODE - No changes will be made"
    echo ""
fi

# ============================================
# PRE-DEPLOYMENT CHECKS
# ============================================
info "Running pre-deployment checks..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not a git repository"
    exit 1
fi

# Check if there are uncommitted changes (NON-INTERACTIVE)
if [ -n "$(git status --porcelain)" ]; then
    if [ "$DRY_RUN" = "1" ]; then
        warning "Working tree has uncommitted changes (DRY RUN mode - continuing)"
    else
        error "Working tree has uncommitted changes. Please commit or stash them before deploying."
        error "To see what's changed: git status"
        error "To stash changes: git stash"
        exit 1
    fi
fi

# ============================================
# GIT PULL
# ============================================
info "Pulling latest changes from $DEPLOY_BRANCH..."
execute git fetch origin "$DEPLOY_BRANCH"
execute git checkout "$DEPLOY_BRANCH"
execute git pull origin "$DEPLOY_BRANCH"

if [ $? -eq 0 ]; then
    success "Git pull successful"
else
    error "Git pull failed"
    exit 1
fi

# ============================================
# VERIFICATION
# ============================================
info "Running verification..."
if [ -f "$PROJECT_ROOT/scripts/verify.sh" ]; then
    if "$PROJECT_ROOT/scripts/verify.sh"; then
        success "Verification passed"
    else
        error "Verification failed. Aborting deployment."
        exit 1
    fi
else
    warning "verify.sh not found. Skipping verification."
fi

# ============================================
# BACKEND BUILD
# ============================================
echo ""
info "Building backend..."
cd "$PROJECT_ROOT"

# Clean previous build
execute rm -f "$BACKEND_BINARY_NAME" "MonetizeeAI_bot"

# Build backend
if execute go build -o "$BACKEND_BINARY_NAME" .; then
    success "Backend build successful"
    execute chmod +x "$BACKEND_BINARY_NAME"
else
    error "Backend build failed"
    exit 1
fi

# ============================================
# FRONTEND BUILD
# ============================================
echo ""
info "Building frontend..."
cd "$PROJECT_ROOT/miniApp"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    info "Installing frontend dependencies..."
    if [ -f "package-lock.json" ]; then
        execute npm ci
    else
        execute npm install
    fi
fi

# Build frontend
if execute npm run build; then
    success "Frontend build successful"
else
    error "Frontend build failed"
    exit 1
fi

# ============================================
# SERVICE RESTART (PLACEHOLDER)
# ============================================
echo ""
info "Service restart instructions:"
echo ""
echo "The following steps need to be performed manually or configured:"
echo ""
echo "1. Backend service restart:"
echo "   - If using supervisor: supervisorctl restart bot"
echo "   - If using systemd: systemctl restart monetizeeai-bot"
echo "   - If using PM2: pm2 restart monetizeeai-bot"
echo "   - If running manually: Stop current process and start: ./bot"
echo ""
echo "2. Frontend deployment:"
echo "   - Copy $FRONTEND_BUILD_DIR/* to your web server directory"
echo "   - If using nginx: sudo systemctl reload nginx"
echo "   - If using Apache: sudo systemctl reload apache2"
echo ""
echo "3. Verify deployment:"
echo "   - Check backend logs"
echo "   - Test frontend in browser"
echo "   - Verify API endpoints"
echo ""

# ============================================
# DEPLOYMENT SUMMARY
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = "1" ]; then
    warning "DRY RUN completed - No actual deployment performed"
    echo ""
    echo "To perform actual deployment, run:"
    echo "  DRY_RUN=0 ./scripts/deploy.sh"
else
    success "Build completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart backend service (see instructions above)"
    echo "  2. Deploy frontend build to web server"
    echo "  3. Verify deployment"
fi

echo ""
