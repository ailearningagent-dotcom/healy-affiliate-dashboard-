import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, getRateLimitId } from "@/lib/rate-limit";

const handler = auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip auth for login page, auth API, public pages, interactive chat
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/showcase") ||
    pathname.startsWith("/agents/playground")
  ) {
    return NextResponse.next();
  }

  // Admin routes: require authentication + admin check
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Skip auth in development if no ADMIN_PASSWORD is set
  if (process.env.NODE_ENV === "development" && !process.env.ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  // Protect API routes with auth + rate limiting
  if (pathname.startsWith("/api/")) {
    // Rate limiting
    const rl = checkRateLimit(getRateLimitId(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter) },
        }
      );
    }

    // Auth check
    if (!req.auth?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
  }

  // Protect app pages
  if (!pathname.startsWith("/api/") && !req.auth?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export function proxy(request: NextRequest, context: { params: Promise<Record<string, string | string[]>> }) {
  return handler(request, context);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
