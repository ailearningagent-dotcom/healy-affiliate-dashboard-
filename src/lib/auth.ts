import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = credentials?.password as string | undefined;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
          // If no admin password is set, allow access in dev mode
          if (process.env.NODE_ENV === "development") {
            return { id: "admin", name: "Admin" };
          }
          return null;
        }
        if (password === adminPassword) {
          return { id: "admin", name: "Admin" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || "dev-secret-do-not-use-in-production-" + Math.random().toString(36).slice(2),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});
