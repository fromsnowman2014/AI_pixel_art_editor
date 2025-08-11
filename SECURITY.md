# Security Guidelines

## Environment Variables

**⚠️ NEVER commit actual API keys or secrets to git!**

### Development Setup

1. Copy `.env.local.example` to `.env.local`
2. Add your actual API keys to `.env.local`
3. Never commit `.env.local` to version control

### Production Deployment

Use platform environment variables (Railway, Vercel) for:
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `JWT_SECRET`

### API Key Security

- Rotate API keys regularly
- Use different keys for development/production
- Monitor API usage for anomalies
- Revoke compromised keys immediately

### If Keys Are Compromised

1. **Immediately revoke the exposed key**
2. Generate new key
3. Update production environment variables
4. Check git history for exposure
5. Monitor for unauthorized usage

## COPPA Compliance

This application is designed for children under 13:
- No personal data collection in anonymous mode
- Clear privacy notices
- Parental consent required for cloud features
- Local-first data storage by default

## Reporting Security Issues

Please report security vulnerabilities to: security@pixelbuddy.com