import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const rawAdapter = PrismaAdapter(prisma);
const adapter = new Proxy(rawAdapter, {
  get(target, prop, receiver) {
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return async (...args: unknown[]) => {
        try {
          const result = await (val as (...a: unknown[]) => Promise<unknown>)(...args);
          console.log(`[adapter] ${String(prop)} OK`);
          return result;
        } catch (e: unknown) {
          const err = e as Error;
          console.error(`[adapter] ${String(prop)} FAILED:`, err.message, err.stack?.slice(0, 500));
          throw e;
        }
      };
    }
    return val;
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  trustHost: true,
  debug: true,
  logger: {
    error(code, ...message) {
      console.error('[auth][error-full]', code, JSON.stringify(message, null, 2));
    },
  },

  cookies: {
    state: {
      name: 'authjs.state',
      options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    pkceCodeVerifier: {
      name: 'authjs.pkce.code_verifier',
      options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    callbackUrl: {
      name: 'authjs.callback-url',
      options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    sessionToken: {
      name: 'authjs.session-token',
      options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  },

  // JWT sessions — no DB lookup on every request
  session: { strategy: 'jwt' },

  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID  ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      checks: ['none'],
    }),

    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [Apple({
          clientId:     process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
        })]
      : []),

    Credentials({
      name: 'Email',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user?.password) return null;

        const passwordMatch = await compare(
          credentials.password as string,
          user.password,
        );
        if (!passwordMatch) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        // Backfill: users who signed up before auto-username shipped get a
        // handle on their next sign-in. `user` is only defined on initial
        // JWT creation, so this runs at most once per session.
        if (user.id) {
          try {
            const { ensureUsername } = await import('@/lib/username');
            await ensureUsername(user.id);
          } catch { /* swallow — /u/<id> still works without a handle */ }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; email?: string }).id = token.id as string;
        (session.user as { id?: string; email?: string }).email = token.email as string;
      }
      return session;
    },
  },

  events: {
    // Fires once when the PrismaAdapter creates a row for a new OAuth user.
    // Credentials signups flow through /api/auth/register which sets the
    // username up front; this event handles Google/Apple/etc. newcomers.
    async createUser({ user }) {
      if (!user.id) return;
      try {
        const { ensureUsername } = await import('@/lib/username');
        await ensureUsername(user.id);
      } catch (e) {
        console.error('[auth/events/createUser] ensureUsername failed:', e);
      }
    },
  },

  pages: {
    // Use our custom modal rather than the default NextAuth sign-in page
    signIn: '/',
  },
});
