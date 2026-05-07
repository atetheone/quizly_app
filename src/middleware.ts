import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Public paths that don't require auth
  const publicPaths = ["/", "/auth/login", "/auth/signup", "/join", "/play", "/api/auth", "/api/sessions", "/api/pusher"];
  const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isPublic) {
    return NextResponse.next();
  }

  // For protected paths, we'll let the client-side auth handle the redirect
  // since NextAuth middleware with Edge runtime has compatibility issues
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};