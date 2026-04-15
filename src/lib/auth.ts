import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db'; // Singleton — avoids connection pool exhaustion

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Dev fallback — works without a database connection
        if (process.env.NODE_ENV !== 'production') {
          const DEV_USERS: Record<string, { name: string; role: Role; password: string }> = {
            'admin@prism.com':    { name: 'Admin User',       role: 'ADMIN',      password: 'Admin@123' },
            'quality@prism.com':  { name: 'Quality Inspector', role: 'QUALITY',    password: 'Quality@123' },
            'store@prism.com':    { name: 'Store Manager',     role: 'STORE',      password: 'Store@123' },
            'purchase@prism.com': { name: 'Purchase Team',     role: 'PURCHASE',   password: 'Purchase@123' },
          };
          const dev = DEV_USERS[credentials.email];
          if (dev && credentials.password === dev.password) {
            return { id: credentials.email, email: credentials.email, name: dev.name, role: dev.role };
          }
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) return null;

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch {
          // Database unreachable — only dev fallback applies
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
};
