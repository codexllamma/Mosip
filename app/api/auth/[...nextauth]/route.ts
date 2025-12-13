import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db"; 
import bcrypt from "bcrypt"; 

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        // 1. Find user in DB
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // 2. Check if user exists
        if (!user) {
          throw new Error("No user found with this email");
        }

        // 3. Check password
        // Note: If you stored plain text in your hackathon demo, verify directly.
        // Otherwise, use bcrypt.compare()
        const isValid = await bcrypt.compare(credentials.password, user.password || "");

        if (!isValid) {
          throw new Error("Invalid password");
        }

        // 4. Return user object (this gets passed to the jwt callback)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // We need to pass this to the session
        };
      }
    })
  ],
  callbacks: {
    // 1. JWT Callback: Add the role to the token
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    // 2. Session Callback: Add the role to the session (accessible in frontend)
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Point to your custom login page
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// IMPORTANT: This is the fix for the "No HTTP methods exported" error
export { handler as GET, handler as POST };