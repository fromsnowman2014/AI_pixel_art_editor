import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import GitHub from "next-auth/providers/github"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { accounts, sessions, users, verificationTokens } from "@/backend/src/db/schema"

const connectionString = process.env.DATABASE_URL!
const pool = postgres(connectionString, { max: 1 })
const db = drizzle(pool)

const providers = []

// Only add providers if credentials are properly configured
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && 
    process.env.AUTH_GOOGLE_ID !== 'your-google-client-id') {
  providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }))
}

if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET && 
    process.env.AUTH_FACEBOOK_ID !== 'your-facebook-app-id') {
  providers.push(Facebook({
    clientId: process.env.AUTH_FACEBOOK_ID,
    clientSecret: process.env.AUTH_FACEBOOK_SECRET,
  }))
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && 
    process.env.AUTH_GITHUB_ID !== 'test-github-client-id') {
  providers.push(GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  }))
}

// Fallback: if no providers are configured, add a mock provider for development
if (providers.length === 0 && process.env.NODE_ENV === 'development') {
  // For development without real OAuth, we'll use email magic links or create a mock provider
  console.warn('No OAuth providers configured. Authentication will be limited in development.')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
  },
})