#!/bin/bash

# Pastebin-Lite Test Script
# Tests all API endpoints and business logic

BASE_URL="http://localhost:3000"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== Pastebin-Lite API Tests ===${NC}\n"

# Test 1: Health Check
echo -e "${BOLD}Test 1: Health Check${NC}"
HEALTH=$(curl -s "$BASE_URL/api/healthz")
echo "Response: $HEALTH"
if echo "$HEALTH" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓ PASS${NC}\n"
else
    echo -e "${YELLOW}⚠ WARNING: Database might not be connected${NC}\n"
fi

# Test 2: Create Simple Paste
echo -e "${BOLD}Test 2: Create Simple Paste${NC}"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pastes" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, World!"}')
echo "Response: $CREATE_RESPONSE"

PASTE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$PASTE_ID" ]; then
    echo -e "${GREEN}✓ PASS - Paste ID: $PASTE_ID${NC}\n"
else
    echo -e "${RED}✗ FAIL${NC}\n"
    exit 1
fi

# Test 3: Get Paste (JSON)
echo -e "${BOLD}Test 3: Get Paste (JSON)${NC}"
GET_RESPONSE=$(curl -s "$BASE_URL/api/pastes/$PASTE_ID")
echo "Response: $GET_RESPONSE"
if echo "$GET_RESPONSE" | grep -q "Hello, World!"; then
    echo -e "${GREEN}✓ PASS${NC}\n"
else
    echo -e "${RED}✗ FAIL${NC}\n"
fi

# Test 4: View Paste (HTML)
echo -e "${BOLD}Test 4: View Paste (HTML)${NC}"
HTML_RESPONSE=$(curl -s "$BASE_URL/p/$PASTE_ID")
if echo "$HTML_RESPONSE" | grep -q "Hello, World!"; then
    echo -e "${GREEN}✓ PASS - HTML rendered${NC}\n"
else
    echo -e "${RED}✗ FAIL${NC}\n"
fi

# Test 5: Create Paste with TTL
echo -e "${BOLD}Test 5: Create Paste with TTL (10 seconds)${NC}"
TTL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pastes" \
  -H "Content-Type: application/json" \
  -d '{"content":"This expires in 10 seconds","ttl_seconds":10}')
echo "Response: $TTL_RESPONSE"

TTL_PASTE_ID=$(echo "$TTL_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TTL_PASTE_ID" ]; then
    echo -e "${GREEN}✓ PASS - Created paste with TTL: $TTL_PASTE_ID${NC}"
    echo -e "${YELLOW}Waiting 11 seconds to test expiry...${NC}"
    sleep 11
    
    EXPIRED_RESPONSE=$(curl -s "$BASE_URL/api/pastes/$TTL_PASTE_ID")
    if echo "$EXPIRED_RESPONSE" | grep -q "404\|expired\|not found"; then
        echo -e "${GREEN}✓ PASS - Paste correctly expired${NC}\n"
    else
        echo -e "${RED}✗ FAIL - Paste should be expired${NC}\n"
    fi
else
    echo -e "${RED}✗ FAIL${NC}\n"
fi

# Test 6: Create Paste with View Limit
echo -e "${BOLD}Test 6: Create Paste with View Limit (max 2 views)${NC}"
VIEW_LIMIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pastes" \
  -H "Content-Type: application/json" \
  -d '{"content":"Limited to 2 views","max_views":2}')
echo "Response: $VIEW_LIMIT_RESPONSE"

VIEW_PASTE_ID=$(echo "$VIEW_LIMIT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$VIEW_PASTE_ID" ]; then
    echo -e "${GREEN}✓ PASS - Created paste with view limit: $VIEW_PASTE_ID${NC}"
    
    # First view
    echo "View 1:"
    curl -s "$BASE_URL/api/pastes/$VIEW_PASTE_ID" | grep -o '"remaining_views":[0-9]*'
    
    # Second view
    echo "View 2:"
    curl -s "$BASE_URL/api/pastes/$VIEW_PASTE_ID" | grep -o '"remaining_views":[0-9]*'
    
    # Third view (should fail)
    echo "View 3 (should return 404):"
    OVER_LIMIT=$(curl -s "$BASE_URL/api/pastes/$VIEW_PASTE_ID")
    if echo "$OVER_LIMIT" | grep -q "404\|exceeded\|not found"; then
        echo -e "${GREEN}✓ PASS - View limit correctly enforced${NC}\n"
    else
        echo -e "${RED}✗ FAIL - Should return 404${NC}\n"
    fi
else
    echo -e "${RED}✗ FAIL${NC}\n"
fi

# Test 7: XSS Prevention
echo -e "${BOLD}Test 7: XSS Prevention${NC}"
XSS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pastes" \
  -H "Content-Type: application/json" \
  -d '{"content":"<script>alert(\"XSS\")</script>Test"}')

XSS_PASTE_ID=$(echo "$XSS_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$XSS_PASTE_ID" ]; then
    HTML=$(curl -s "$BASE_URL/p/$XSS_PASTE_ID")
    if echo "$HTML" | grep -q "<script>" && ! echo "$HTML" | grep -q "<script>alert"; then
        echo -e "${RED}✗ FAIL - Script tag not properly escaped${NC}\n"
    else
        echo -e "${GREEN}✓ PASS - XSS properly prevented${NC}\n"
    fi
else
    echo -e "${RED}✗ FAIL${NC}\n"
fi

# Test 8: Invalid Input Handling
echo -e "${BOLD}Test 8: Invalid Input (empty content)${NC}"
INVALID_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/pastes" \
  -H "Content-Type: application/json" \
  -d '{"content":""}')

if echo "$INVALID_RESPONSE" | grep -q "400"; then
    echo -e "${GREEN}✓ PASS - Correctly rejected empty content${NC}\n"
else
    echo -e "${RED}✗ FAIL - Should return 400${NC}\n"
fi

# Test 9: Non-existent Paste
echo -e "${BOLD}Test 9: Non-existent Paste${NC}"
NOT_FOUND=$(curl -s -w "%{http_code}" "$BASE_URL/api/pastes/nonexistent123")

if echo "$NOT_FOUND" | grep -q "404"; then
    echo -e "${GREEN}✓ PASS - Correctly returned 404${NC}\n"
else
    echo -e "${RED}✗ FAIL - Should return 404${NC}\n"
fi

echo -e "${BOLD}=== Test Summary ===${NC}"
echo -e "All basic tests completed. Review the output above for results."
