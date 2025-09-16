# OAuth Provider Setup Instructions

This document provides step-by-step instructions to set up OAuth applications for PixelBuddy authentication.

## Prerequisites

- GitHub account
- Google account  
- Facebook/Meta account
- Access to respective developer consoles

## Development URLs

- **Local Development**: `http://localhost:3003`
- **Production**: `https://ai-pixel-art-editor.vercel.app`

## 1. GitHub OAuth App Setup

### Step 1: Create GitHub OAuth App
1. Go to [GitHub Settings > Developer settings > OAuth apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the following details:

```
Application name: PixelBuddy (Development)
Homepage URL: http://localhost:3003
Authorization callback URL: http://localhost:3003/api/auth/callback/github
Application description: Kids-friendly AI-assisted pixel art and GIF studio - Development version
```

4. Click "Register application"
5. Copy the **Client ID** and **Client Secret**

### Step 2: Update Environment Variables
Add to `.env.local`:
```env
AUTH_GITHUB_ID=your_github_client_id_here
AUTH_GITHUB_SECRET=your_github_client_secret_here
```

### Step 3: Create Production GitHub OAuth App
1. Create another OAuth app for production:
```
Application name: PixelBuddy
Homepage URL: https://ai-pixel-art-editor.vercel.app
Authorization callback URL: https://ai-pixel-art-editor.vercel.app/api/auth/callback/github
Application description: Kids-friendly AI-assisted pixel art and GIF studio
```

## 2. Google OAuth App Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project named "PixelBuddy"
3. Enable the Google+ API

### Step 2: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type
3. Fill in application details:
```
App name: PixelBuddy
User support email: your_email@example.com
Developer contact information: your_email@example.com
```

### Step 3: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure:

**Development:**
```
Name: PixelBuddy Development
Authorized JavaScript origins: http://localhost:3003
Authorized redirect URIs: http://localhost:3003/api/auth/callback/google
```

**Production:**
```
Name: PixelBuddy Production
Authorized JavaScript origins: https://ai-pixel-art-editor.vercel.app
Authorized redirect URIs: https://ai-pixel-art-editor.vercel.app/api/auth/callback/google
```

### Step 4: Update Environment Variables
Add to `.env.local`:
```env
AUTH_GOOGLE_ID=your_google_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_client_secret
```

## 3. Facebook OAuth App Setup

### Step 1: Create Facebook App
1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Click "My Apps" > "Create App"
3. Select "Consumer" as app type
4. Fill in basic information:
```
App Name: PixelBuddy
App Contact Email: your_email@example.com
```

### Step 2: Add Facebook Login Product
1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Select "Web" platform

### Step 3: Configure Facebook Login Settings
1. Go to "Facebook Login" > "Settings"
2. Add Valid OAuth Redirect URIs:

**Development:**
```
http://localhost:3003/api/auth/callback/facebook
```

**Production:**
```
https://ai-pixel-art-editor.vercel.app/api/auth/callback/facebook
```

### Step 4: Get App Credentials
1. Go to "Settings" > "Basic"
2. Copy the **App ID** and **App Secret**

### Step 5: Update Environment Variables
Add to `.env.local`:
```env
AUTH_FACEBOOK_ID=your_facebook_app_id
AUTH_FACEBOOK_SECRET=your_facebook_app_secret
```

## 4. Environment Variables Summary

### Development (`.env.local`)
```env
# NextAuth Configuration
NEXTAUTH_SECRET=pixelbuddy-dev-secret-2025-very-long-secure-key-for-jwt-tokens-local-development-only
NEXTAUTH_URL=http://localhost:3003

# GitHub OAuth
AUTH_GITHUB_ID=your_github_dev_client_id
AUTH_GITHUB_SECRET=your_github_dev_client_secret

# Google OAuth
AUTH_GOOGLE_ID=your_google_dev_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_dev_client_secret

# Facebook OAuth
AUTH_FACEBOOK_ID=your_facebook_dev_app_id
AUTH_FACEBOOK_SECRET=your_facebook_dev_app_secret
```

### Production (Vercel Environment Variables)
```env
# NextAuth Configuration
NEXTAUTH_SECRET=production-nextauth-secret-very-long-secure-key
NEXTAUTH_URL=https://ai-pixel-art-editor.vercel.app

# GitHub OAuth
AUTH_GITHUB_ID=your_github_prod_client_id
AUTH_GITHUB_SECRET=your_github_prod_client_secret

# Google OAuth
AUTH_GOOGLE_ID=your_google_prod_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_prod_client_secret

# Facebook OAuth
AUTH_FACEBOOK_ID=your_facebook_prod_app_id
AUTH_FACEBOOK_SECRET=your_facebook_prod_app_secret
```

## 5. Testing Authentication

### Local Testing
1. Start the development server: `npm run dev`
2. Navigate to: `http://localhost:3003/api/auth/providers`
3. Should return JSON with configured providers
4. Navigate to: `http://localhost:3003/auth/signin`
5. Test sign-in with each provider

### Production Testing
1. Deploy to Vercel with production environment variables
2. Navigate to: `https://ai-pixel-art-editor.vercel.app/api/auth/providers`
3. Test sign-in flows

## 6. Common Issues & Solutions

### "OAuth app not found" error
- Verify Client ID matches exactly
- Check callback URLs are correct
- Ensure OAuth app is not suspended

### "redirect_uri_mismatch" error  
- Double-check callback URLs in OAuth app settings
- Ensure protocol (http/https) matches
- Verify domain spelling

### "invalid_client" error
- Verify Client Secret is correct
- Check environment variables are properly set
- Restart development server after env changes

### NextAuth session issues
- Clear browser cookies and localStorage
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches current domain

## 7. Security Best Practices

- **Never commit OAuth secrets** to version control
- Use different OAuth apps for development and production
- Regularly rotate OAuth secrets
- Implement proper error handling
- Set appropriate OAuth scopes (minimal required permissions)

## 8. COPPA Compliance Notes

For the kids-friendly nature of PixelBuddy:
- Only collect minimal user information (email for parent/teacher accounts)
- Implement parental consent workflow
- Provide clear privacy controls
- Enable local-only mode for under-13 users
- Regular privacy audits and data retention policies

## Next Steps

After setting up OAuth providers:
1. Test all authentication flows
2. Implement cloud save functionality
3. Add user profile management
4. Set up database schema for user accounts
5. Add project ownership and 3-project limits