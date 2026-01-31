#!/bin/bash

# =============================================================================
# Phase 2 Smoke Tests
# =============================================================================
# Run this script after deploying Phase 2 changes to verify everything works.
# Usage: ./scripts/phase2-smoke.sh [base_url]
# Example: ./scripts/phase2-smoke.sh https://sianmarketing.com
# =============================================================================

set -Eeuo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (default to production)
BASE_URL="${1:-https://sianmarketing.com}"

echo "=========================================="
echo "Phase 2 Smoke Tests"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    local check_content="$4"
    
    echo -n "Testing: $name ... "
    
    # Get HTTP code and response
    response=$(curl -sS -w "\n%{http_code}" "$url" 2>/dev/null || echo "CURL_ERROR")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "CURL_ERROR" ]; then
        echo -e "${RED}FAIL${NC} (connection error)"
        FAILED=$((FAILED + 1))
        return
    fi
    
    if [ "$http_code" = "$expected_code" ]; then
        if [ -n "$check_content" ]; then
            if echo "$body" | grep -q "$check_content"; then
                echo -e "${GREEN}PASS${NC} (HTTP $http_code, content OK)"
                PASSED=$((PASSED + 1))
            else
                echo -e "${YELLOW}WARN${NC} (HTTP $http_code, content mismatch)"
                PASSED=$((PASSED + 1))
            fi
        else
            echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
            PASSED=$((PASSED + 1))
        fi
    else
        echo -e "${RED}FAIL${NC} (expected $expected_code, got $http_code)"
        FAILED=$((FAILED + 1))
    fi
}

# Test function for redirects
test_redirect() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    local expected_location="$4"
    
    echo -n "Testing: $name ... "
    
    # Get headers
    headers=$(curl -sS -I "$url" 2>/dev/null || echo "CURL_ERROR")
    
    if echo "$headers" | grep -q "CURL_ERROR"; then
        echo -e "${RED}FAIL${NC} (connection error)"
        FAILED=$((FAILED + 1))
        return
    fi
    
    http_code=$(echo "$headers" | grep -i "^HTTP/" | tail -1 | awk '{print $2}')
    location=$(echo "$headers" | grep -i "^location:" | awk '{print $2}' | tr -d '\r')
    
    if [ "$http_code" = "$expected_code" ]; then
        if [ -n "$expected_location" ]; then
            if echo "$location" | grep -q "$expected_location"; then
                echo -e "${GREEN}PASS${NC} (HTTP $http_code -> $location)"
                PASSED=$((PASSED + 1))
            else
                echo -e "${YELLOW}WARN${NC} (HTTP $http_code, location: $location)"
                PASSED=$((PASSED + 1))
            fi
        else
            echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
            PASSED=$((PASSED + 1))
        fi
    else
        echo -e "${RED}FAIL${NC} (expected $expected_code, got $http_code)"
        FAILED=$((FAILED + 1))
    fi
}

# Test function for headers
test_header() {
    local name="$1"
    local url="$2"
    local header_name="$3"
    
    echo -n "Testing: $name ... "
    
    headers=$(curl -sS -I "$url" 2>/dev/null || echo "CURL_ERROR")
    
    if echo "$headers" | grep -q "CURL_ERROR"; then
        echo -e "${RED}FAIL${NC} (connection error)"
        FAILED=$((FAILED + 1))
        return
    fi
    
    if echo "$headers" | grep -qi "^$header_name:"; then
        value=$(echo "$headers" | grep -i "^$header_name:" | head -1 | cut -d: -f2- | tr -d '\r' | xargs)
        echo -e "${GREEN}PASS${NC} ($header_name: $value)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} ($header_name not found)"
        FAILED=$((FAILED + 1))
    fi
}

echo "--- Redirect Tests ---"
test_redirect "Root -> /miniapp/" "$BASE_URL/" "302" "/miniapp"

echo ""
echo "--- SPA Tests ---"
test_endpoint "MiniApp index" "$BASE_URL/miniapp/" "200" "<!DOCTYPE"
test_endpoint "MiniApp SPA route (deep)" "$BASE_URL/miniapp/levels" "200" "<!DOCTYPE"

echo ""
echo "--- Health Check Tests ---"
test_endpoint "Health (canonical)" "$BASE_URL/health" "200" "healthy"

echo ""
echo "--- API Tests ---"
test_endpoint "API verify (no token)" "$BASE_URL/api/v1/web/verify?telegram_id=12345" "401" ""
# Verify /api/v1/web/verify returns X-Request-Id (observability)
test_header "X-Request-Id on API verify" "$BASE_URL/api/v1/web/verify?telegram_id=12345" "X-Request-Id"

echo ""
echo "--- Backward compat (optional; may 404 if Nginx rewrites not enabled) ---"
# Old path: 401 or 404 both acceptable during/after migration
code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo "000")
if [ "$code" = "200" ]; then
  echo "  /api/health -> 200 OK (backward compat enabled)"
else
  echo "  /api/health -> $code (optional; enable rewrite in Nginx for compat)"
fi
code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/api/api/v1/web/verify?telegram_id=12345" 2>/dev/null || echo "000")
if [ "$code" = "401" ] || [ "$code" = "200" ]; then
  echo "  /api/api/v1/... -> $code (backward compat OK)"
else
  echo "  /api/api/v1/... -> $code (optional; enable rewrite in Nginx for compat)"
fi

echo ""
echo "--- Header Tests ---"
test_header "X-Request-Id on /health" "$BASE_URL/health" "X-Request-Id"
test_header "X-Served-By header" "$BASE_URL/miniapp/" "X-Served-By"

echo ""
echo "=========================================="
echo "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed! Check the output above.${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
