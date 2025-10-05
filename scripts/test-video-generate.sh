#!/bin/bash

# Test script for video-generate Edge Function
# This script requires a valid JWT token from an authenticated user

echo "🧪 Testing video-generate Edge Function"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local file not found"
  exit 1
fi

# Load environment variables
source .env.local

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

echo "📡 Supabase URL: ${SUPABASE_URL}"
echo ""

# Check if user provided JWT token
if [ -z "$1" ]; then
  echo "❌ Missing JWT token"
  echo ""
  echo "📝 How to get your JWT token:"
  echo "   1. Open your browser DevTools (F12)"
  echo "   2. Go to Application/Storage → Local Storage"
  echo "   3. Find key starting with 'sb-' and ending with '-auth-token'"
  echo "   4. Copy the 'access_token' value from the JSON"
  echo ""
  echo "💡 Usage: ./scripts/test-video-generate.sh YOUR_JWT_TOKEN"
  echo ""
  exit 1
fi

JWT_TOKEN="$1"

echo "🔑 JWT token provided"
echo ""

# Test payload
PAYLOAD='{
  "prompt": "a cute cat walking in a garden with flowers",
  "width": 64,
  "height": 64,
  "colorCount": 16,
  "fps": 24
}'

echo "📦 Test payload:"
echo "${PAYLOAD}"
echo ""

echo "🚀 Calling video-generate API..."
echo ""

# Make API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SUPABASE_URL}/functions/v1/video-generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -d "${PAYLOAD}")

# Split response and status code
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)

echo "📡 Response status: ${HTTP_STATUS}"
echo "📄 Response body:"
echo "${HTTP_BODY}" | python3 -m json.tool 2>/dev/null || echo "${HTTP_BODY}"
echo ""

# Check if successful
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "✅ API call successful!"
  echo ""

  # Extract job ID
  JOB_ID=$(echo "${HTTP_BODY}" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['jobId'])" 2>/dev/null)

  if [ -n "$JOB_ID" ]; then
    echo "📋 Job created:"
    echo "   Job ID: ${JOB_ID}"
    echo ""
    echo "🔍 Check job in Supabase Dashboard:"
    echo "   https://supabase.com/dashboard/project/fdiwnymnikylraofwhdu/editor"
    echo ""
    echo "🎉 Phase 2 test PASSED!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait for Luma webhook callback (1-3 minutes)"
    echo "   2. Proceed to Phase 3 (video-webhook Edge Function)"
    echo ""
  fi
else
  echo "❌ API call failed with status ${HTTP_STATUS}"
  echo ""

  if [ "$HTTP_STATUS" -eq 401 ]; then
    echo "💡 Token might be expired. Get a fresh token:"
    echo "   1. Sign in to http://localhost:3000"
    echo "   2. Open DevTools → Application → Local Storage"
    echo "   3. Copy new access_token"
    echo ""
  fi

  exit 1
fi
