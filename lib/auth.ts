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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
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