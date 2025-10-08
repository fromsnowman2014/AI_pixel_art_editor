#!/bin/bash

# Test video-generate Edge Function with NextAuth headers

echo "🧪 Testing video-generate Edge Function..."
echo ""

# Test data
USER_EMAIL="test@example.com"
USER_ID="test-user-123"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXdueW1uaWt5bHJhb2Z3aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzOTU5MTYsImV4cCI6MjA0OTk3MTkxNn0.EbGm9MIi2e5PtQnVqFuLxZtqXMDZG-wm6NjBlCVr1dw}"

echo "Testing with:"
echo "  User Email: $USER_EMAIL"
echo "  User ID: $USER_ID"
echo ""

curl -X POST \
  https://fdiwnymnikylraofwhdu.supabase.co/functions/v1/video-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "x-user-email: $USER_EMAIL" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "prompt": "a cute cat walking",
    "width": 64,
    "height": 64,
    "colorCount": 16,
    "fps": 12
  }' \
  -v

echo ""
echo "✅ Test complete"
