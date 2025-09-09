#!/bin/bash

# Authentication Testing Script for PixelBuddy
echo "🔐 Testing PixelBuddy Authentication Setup"
echo "========================================"

# Check if dev server is running
echo -n "📡 Checking dev server (localhost:3003)... "
if curl -s http://localhost:3003 > /dev/null; then
    echo "✅ Running"
else
    echo "❌ Not running"
    echo "   Please start dev server: npm run dev"
    exit 1
fi

# Test NextAuth providers endpoint
echo -n "🔌 Testing auth providers endpoint... "
PROVIDERS_RESPONSE=$(curl -s http://localhost:3003/api/auth/providers)
if [ "$PROVIDERS_RESPONSE" = "{}" ]; then
    echo "⚠️  No providers configured"
    echo "   Please set up OAuth credentials in .env.local"
    echo "   See: docs/IMMEDIATE_OAUTH_SETUP.md"
elif echo "$PROVIDERS_RESPONSE" | grep -q "github\|google\|facebook"; then
    echo "✅ Providers found"
    echo "   Available: $(echo $PROVIDERS_RESPONSE | jq -r 'keys | join(", ")')"
else
    echo "❌ Invalid response"
    echo "   Response: $PROVIDERS_RESPONSE"
fi

# Test NextAuth CSRF endpoint  
echo -n "🛡️  Testing CSRF token... "
CSRF_RESPONSE=$(curl -s http://localhost:3003/api/auth/csrf)
if echo "$CSRF_RESPONSE" | grep -q "csrfToken"; then
    echo "✅ Working"
else
    echo "❌ Failed" 
    echo "   Response: $CSRF_RESPONSE"
fi

# Test sign-in page
echo -n "📋 Testing sign-in page... "
SIGNIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/auth/signin)
if [ "$SIGNIN_STATUS" = "200" ]; then
    echo "✅ Loading (HTTP $SIGNIN_STATUS)"
else
    echo "❌ Error (HTTP $SIGNIN_STATUS)"
fi

# Check environment variables
echo ""
echo "🔧 Environment Check:"
if [ -f ".env.local" ]; then
    echo "   ✅ .env.local exists"
    
    if grep -q "NEXTAUTH_SECRET=" .env.local && ! grep -q "NEXTAUTH_SECRET=$" .env.local; then
        echo "   ✅ NEXTAUTH_SECRET configured"
    else
        echo "   ❌ NEXTAUTH_SECRET missing or empty"
    fi
    
    if grep -q "NEXTAUTH_URL=" .env.local; then
        echo "   ✅ NEXTAUTH_URL configured"
    else
        echo "   ❌ NEXTAUTH_URL missing"
    fi
    
    # Check OAuth providers
    OAUTH_COUNT=0
    if grep -q "^AUTH_GITHUB_ID=" .env.local; then
        echo "   ✅ GitHub OAuth configured"
        OAUTH_COUNT=$((OAUTH_COUNT + 1))
    else
        echo "   ⚠️  GitHub OAuth not configured"
    fi
    
    if grep -q "^AUTH_GOOGLE_ID=" .env.local; then
        echo "   ✅ Google OAuth configured"
        OAUTH_COUNT=$((OAUTH_COUNT + 1))
    else
        echo "   ⚠️  Google OAuth not configured"
    fi
    
    if grep -q "^AUTH_FACEBOOK_ID=" .env.local; then
        echo "   ✅ Facebook OAuth configured" 
        OAUTH_COUNT=$((OAUTH_COUNT + 1))
    else
        echo "   ⚠️  Facebook OAuth not configured"
    fi
    
    if [ $OAUTH_COUNT -eq 0 ]; then
        echo "   ❌ No OAuth providers configured!"
        echo "   📖 See: docs/IMMEDIATE_OAUTH_SETUP.md"
    elif [ $OAUTH_COUNT -eq 1 ]; then
        echo "   ⚠️  Only 1 OAuth provider configured (recommend 2-3)"
    else
        echo "   ✅ $OAUTH_COUNT OAuth providers configured"
    fi
    
else
    echo "   ❌ .env.local not found"
    echo "   📖 Copy .env.local.example and configure OAuth credentials"
fi

echo ""
echo "🎯 Next Steps:"
echo "   1. Create GitHub OAuth app: https://github.com/settings/applications/new"
echo "   2. Update .env.local with real OAuth credentials"  
echo "   3. Test sign-in: http://localhost:3003/auth/signin"
echo "   4. Check providers: http://localhost:3003/api/auth/providers"
echo ""
echo "📚 Documentation:"
echo "   - Quick setup: docs/IMMEDIATE_OAUTH_SETUP.md"
echo "   - Full guide: docs/OAUTH_SETUP_INSTRUCTIONS.md"