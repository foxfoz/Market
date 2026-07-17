import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const user = token ? await verifyToken(token) : null;
  const pathname = req.nextUrl.pathname;

  // Protect dashboard routes
  if (pathname === "/" || pathname.startsWith("/new-company") || pathname.match(/^\/[a-zA-Z0-9]+(\/|$)/)) {
    // Exclude static auth pages and invite pages from redirecting unauthenticated users here
    if (
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/invite/") ||
      pathname.startsWith("/api/")
    ) {
      return NextResponse.next();
    }

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
