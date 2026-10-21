import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, ROUTES } from "@/constants/routes";

export function proxy(request: NextRequest) {
  if (request.cookies.has(AUTH_COOKIE)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(ROUTES.login, request.url));
}

export const config = {
  matcher: ["/orders/:path*"],
};
