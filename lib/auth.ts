import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import GitHubProvider from "next-auth/providers/github"

const providers = []

// Only add providers if credentials are properly configured
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && 
    process.env.AUTH_GOOGLE_ID !== 'your-google-client-id') {
  providers.push(GoogleProvider({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }))
}

if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET && 
    process.env.AUTH_FACEBOOK_ID !== 'your-facebook-app-id') {
  providers.push(FacebookProvider({
    clientId: process.env.AUTH_FACEBOOK_ID,
    clientSecret: process.env.AUTH_FACEBOOK_SECRET,
  }))
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && 
    process.env.AUTH_GITHUB_ID !== 'test-github-client-id') {
  providers.push(GitHubProvider({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  }))
}

// NextAuth v4 configuration
export default NextAuth({
  providers,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, token }: any) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})