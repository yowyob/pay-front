import {
  getAccessTokenCookieName,
  getOrganizationIdCookieName,
  getTenantIdCookieName,
} from "@/lib/session-cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/tenants", "/organizations", "/direct-payment"];

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

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
        return redirectTo(request, "/console");
      }
      if (tenantId) {
        return redirectTo(request, "/organizations");
      }
      return redirectTo(request, "/tenants");
    }
    return NextResponse.next();
  }

  if (!accessToken) {
    return redirectTo(request, "/login");
  }

  if (!tenantId && pathname !== "/tenants") {
    return redirectTo(request, "/tenants");
  }

  if (tenantId && pathname === "/tenants") {
    return redirectTo(request, organizationId ? "/console" : "/organizations");
  }

  if (
    !organizationId &&
    pathname !== "/organizations" &&
    pathname !== "/tenants"
  ) {
    return redirectTo(request, "/organizations");
  }

  if (organizationId && pathname === "/organizations") {
    return redirectTo(request, "/console");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
