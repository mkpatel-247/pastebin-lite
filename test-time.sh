#!/bin/bash

# Test Deterministic Time (TEST_MODE=1)
# This script demonstrates the x-test-now-ms header functionality

BASE_URL="http://localhost:3000"

echo "=== Deterministic Time Testing ==="
echo ""
echo "Make sure TEST_MODE=1 is set in your .env file"
echo ""

# Create a paste with 30 second TTL
echo "1. Creating paste with 30 second TTL..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pastes" \
  -H "Content-Type: application/json" \
  -d '{"content":"Time test paste","ttl_seconds":30}')

echo "$CREATE_RESPONSE"
PASTE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PASTE_ID" ]; then
    echo "Failed to create paste"
    exit 1
fi

echo ""
echo "2. Access paste immediately (should work)..."
NOW_MS=$(date +%s000)
RESPONSE=$(curl -s "$BASE_URL/api/pastes/$PASTE_ID" \
  -H "x-test-now-ms: $NOW_MS")
echo "$RESPONSE"

echo ""
echo "3. Access paste 20 seconds in the future (should still work)..."
FUTURE_20=$((NOW_MS + 20000))
RESPONSE=$(curl -s "$BASE_URL/api/pastes/$PASTE_ID" \
  -H "x-test-now-ms: $FUTURE_20")
echo "$RESPONSE"

echo ""
echo "4. Access paste 31 seconds in the future (should be expired - 404)..."
FUTURE_31=$((NOW_MS + 31000))
RESPONSE=$(curl -s "$BASE_URL/api/pastes/$PASTE_ID" \
  -H "x-test-now-ms: $FUTURE_31")
echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "404\|expired"; then
    echo ""
    echo "✓ SUCCESS: Deterministic time is working correctly!"
else
    echo ""
    echo "✗ FAILED: Paste should be expired"
fi
