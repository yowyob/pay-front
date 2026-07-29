import {
  getAccessTokenCookieName,
  getOrganizationIdCookieName,
  getTenantIdCookieName,
} from "@/lib/session-cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/tenants", "/organizations", "/direct-payment"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(getAccessTokenCookieName())?.value;
  const tenantId = request.cookies.get(getTenantIdCookieName())?.value;
  const organizationId = request.cookies.get(
    getOrganizationIdCookieName(),
  )?.value;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/direct-payment") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next");

  if (isPublic) {
    if (
      accessToken &&
      pathname === "/login" &&
      !request.nextUrl.searchParams.get("step")
    ) {
      if (organizationId) {
        return NextResponse.redirect(new URL("/console", request.url));
      }
      if (tenantId) {
        return NextResponse.redirect(new URL("/organizations", request.url));
      }
      return NextResponse.redirect(new URL("/tenants", request.url));
    }
    return NextResponse.next();
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!tenantId && pathname !== "/tenants") {
    return NextResponse.redirect(new URL("/tenants", request.url));
  }

  if (tenantId && pathname === "/tenants") {
    return NextResponse.redirect(
      new URL(organizationId ? "/console" : "/organizations", request.url),
    );
  }

  if (
    !organizationId &&
    pathname !== "/organizations" &&
    pathname !== "/tenants"
  ) {
    return NextResponse.redirect(new URL("/organizations", request.url));
  }

  if (organizationId && pathname === "/organizations") {
    return NextResponse.redirect(new URL("/console", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
