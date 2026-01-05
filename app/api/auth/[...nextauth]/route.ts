// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth"; // Import NextAuthOptions
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db"; 
import bcrypt from "bcryptjs"; 

// explicit type annotation fixes "implicit any" and "strategy" errors
export const authOptions: NextAuthOptions = {
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password || "");

        if (!isValid) {
          throw new Error("Invalid password");
        }

        // Return an object that matches the augmented User type
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, 
        };
      }
    })
  ],
  callbacks: {
    // Types are now inferred correctly from NextAuthOptions
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };