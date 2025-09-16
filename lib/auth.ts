import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import GitHubProvider from "next-auth/providers/github"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"

// Validate required environment variables
const requiredEnvVars = ['NEXTAUTH_SECRET']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Missing environment variable: ${envVar}`)
  }
}

const providers = []

// Google OAuth Provider
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && 
    process.env.AUTH_GOOGLE_ID !== 'your-google-client-id') {
  providers.push(GoogleProvider({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    authorization: {
      params: {
        scope: 'openid email profile',
        prompt: 'consent',
      },
    },
  }))
}

// Facebook OAuth Provider
if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET &&
    process.env.AUTH_FACEBOOK_ID !== 'your-facebook-app-id') {
  providers.push(FacebookProvider({
    clientId: process.env.AUTH_FACEBOOK_ID,
    clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    authorization: {
      params: {
        scope: 'email',
      },
    },
  }))
}

// GitHub OAuth Provider
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && 
    process.env.AUTH_GITHUB_ID !== 'test-github-client-id') {
  providers.push(GitHubProvider({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    authorization: {
      params: {
        scope: 'read:user user:email',
      },
    },
  }))
}

// Ensure we have at least one provider to prevent NextAuth errors
const finalProviders = providers.length > 0 ? providers : [
  GoogleProvider({
    clientId: process.env.AUTH_GOOGLE_ID || 'dummy-client-id',
    clientSecret: process.env.AUTH_GOOGLE_SECRET || 'dummy-client-secret',
  })
]

export const authOptions: NextAuthOptions = {
  // adapter: DrizzleAdapter(db), // TODO: Enable after database schema verification
  providers,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.provider = account.provider
        token.userId = user.id || token.sub || ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        // @ts-ignore - Adding custom properties to session user
        session.user.id = token.userId as string
        session.user.provider = token.provider as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Add custom sign-in logic here
      console.log('Sign in attempt:', {
        provider: account?.provider,
        email: user.email,
        nextauth_url: process.env.NEXTAUTH_URL,
        callback_url: `${process.env.NEXTAUTH_URL}/api/auth/callback/${account?.provider}`
      })
      return true
    },
    async redirect({ url, baseUrl }) {
      // Redirect to home page after successful sign-in
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log('User signed in:', { 
        email: user.email, 
        provider: account?.provider, 
        isNewUser 
      })
    },
    async signOut({ session }) {
      console.log('User signed out:', session?.user?.email)
    }
  },
  debug: process.env.NODE_ENV === 'development',
  // Add additional configuration to prevent build errors
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
}

export default authOptions