import {
  getAccessTokenCookieName,
  getOrganizationIdCookieName,
  getRefreshTokenCookieName,
  getTenantIdCookieName,
} from "@/lib/session-cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/tenants", "/organizations"];

/**
 * Règlement d'un achat : PUBLIC, et c'est le cœur de la caisse commune.
 *
 * Une plateforme vend à un client de passage, qui n'a pas de compte Yowyob et ne peut donc pas en
 * franchir la connexion : il règle par mobile money, depuis son téléphone. Exiger une session ici
 * lui fermait la porte, et exiger en plus un tenant et une organisation la fermait même à un
 * acheteur connecté qui n'a pas encore choisi de contexte.
 *
 * Ce qui tient lieu de garde : l'identifiant de l'achat. Il est imprévisible, à durée limitée, et
 * vaut invitation — c'est la doctrine du noyau pour tout le parcours invité. Le chemin par
 * portefeuille, lui, reste derrière la connexion : la page ne le propose qu'à une session établie.
 */
const PUBLIC_PREFIXES = ["/checkout/"];

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
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
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
