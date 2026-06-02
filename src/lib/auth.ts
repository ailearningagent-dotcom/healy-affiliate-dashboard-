import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Returns the auth secret — generates a deterministic fallback if not provided.
 * This ensures the app works even without AUTH_SECRET set in env vars.
 * In production, you should still set AUTH_SECRET for security.
 */
function getAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // Fallback allows login to work until user sets proper AUTH_SECRET in Vercel env.
  return "marketai-fallback-secret-2024-do-not-use-in-production";
}

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // NextAuth credentials only contains defined credential fields.
        // Extract IP from the raw credentials object safely.
        const creds = credentials as Record<string, unknown> | undefined;
        const ip = typeof creds?.ip === "string" ? creds.ip : undefined;
        const identifier = ip || "auth:unknown";

        const rateCheck = checkRateLimit(identifier, { maxRequests: 5, windowSeconds: 300 });
        if (!rateCheck.allowed) {
          throw new Error(`Too many attempts. Try again in ${rateCheck.retryAfter} seconds.`);
        }

        const password = credentials?.password as string | undefined;
        if (!password) return null;

        // Prefer hashed password, fallback to plain text with warning
        if (ADMIN_PASSWORD_HASH) {
          const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
          if (!valid) return null;
        } else if (ADMIN_PASSWORD) {
          if (password !== ADMIN_PASSWORD) return null;
          console.warn(
            "[Auth] ADMIN_PASSWORD is set without ADMIN_PASSWORD_HASH. " +
            "Generate a hash with: node -e \"require('bcryptjs').hash('your-password', 12).then(console.log)\""
          );
        } else {
          if (process.env.NODE_ENV === "development") {
            return { id: "admin", name: "Admin" };
          }
          return null;
        }

        return { id: "admin", name: "Admin" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});
