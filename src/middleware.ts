import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";

export function middleware(request: NextRequest) {
  // Public paths that don't require auth
  const publicPaths = ["/", "/auth/login", "/auth/signup", "/join", "/play", "/api/auth", "/api/sessions", "/api/pusher"];
  const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  // For protected paths, we'll let the client-side auth handle the redirect
  // since NextAuth middleware with Edge runtime has compatibility issues.
  // Both public and protected paths fall through to the same response — the
  // only added behaviour is stamping the locale cookie on first visit.
  void isPublic;
  const response = NextResponse.next();

  // First-visit locale detection (Edge-safe: only headers + cookies, no
  // NextAuth import). The cookie wins on subsequent requests and is set
  // explicitly by the language switcher, so we never clobber a choice.
  if (!request.cookies.get(LOCALE_COOKIE)) {
    const locale = resolveLocale(request.headers.get("accept-language"));
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
