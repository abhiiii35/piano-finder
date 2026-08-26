import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Bound brute-force guesses per account before touching the DB.
        const limit = rateLimit(`login:${credentials.email.toLowerCase()}`, 10, 15 * 60_000);
        if (!limit.ok) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isValid = await compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          return null;
        }

        if (user.suspendedAt) {
          // Surfaced to the sign-in page as result.error === "SUSPENDED"
          throw new Error("SUSPENDED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                // Default NextAuth scopes (openid email profile) plus
                // read-only Contacts access for the customer-import wizard.
                scope:
                  "openid email profile https://www.googleapis.com/auth/contacts.readonly",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser?.suspendedAt) return false;
        // Auto-verify OAuth users — the provider already verified their email
        if (dbUser && !dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified ?? null;
        token.suspended = false;
        token.suspendedCheckedAt = Date.now();
        return token;
      }
      // Re-check suspension against the DB at most every 15 minutes
      const RECHECK_MS = 15 * 60 * 1000;
      const checkedAt = token.suspendedCheckedAt ?? 0;
      if (Date.now() - checkedAt > RECHECK_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { suspendedAt: true },
        });
        token.suspended = Boolean(dbUser?.suspendedAt);
        token.suspendedCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },
};
