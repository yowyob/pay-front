import {
  getAccessTokenCookieName,
  getOrganizationIdCookieName,
  getRefreshTokenCookieName,
  getTenantIdCookieName,
} from "@/lib/session-cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/tenants", "/organizations"];

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Caisse ouverte par une plateforme Yowyob : l'acheteur doit y revenir une fois connecté. Le chemin
 * demandé suit toutes les étapes (connexion, tenant, organisation) dans `returnTo`.
 */
function redirectKeepingCheckout(request: NextRequest, pathname: string) {
  const { pathname: requested, search } = request.nextUrl;
  if (!requested.startsWith("/checkout/")) {
    return redirectTo(request, pathname);
  }
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  url.searchParams.set("returnTo", `${requested}${search}`);
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
    // Jeton d'accès expiré (15 min) mais session encore valable (14 jours) : on la reprend au lieu
    // de redemander la connexion, puis on revient à la page demandée.
    if (request.cookies.get(getRefreshTokenCookieName())?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/api/auth/resume";
      url.search = "";
      url.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    return redirectKeepingCheckout(request, "/login");
  }

  if (!tenantId && pathname !== "/tenants") {
    return redirectKeepingCheckout(request, "/tenants");
  }

  if (tenantId && pathname === "/tenants") {
    return redirectTo(request, organizationId ? "/console" : "/organizations");
  }

  if (
    !organizationId &&
    pathname !== "/organizations" &&
    pathname !== "/tenants"
  ) {
    return redirectKeepingCheckout(request, "/organizations");
  }

  if (organizationId && pathname === "/organizations") {
    return redirectTo(request, "/console");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
