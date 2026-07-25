import {
  getAccessTokenCookieName,
  getTenantIdCookieName,
} from "@/lib/session-cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// L'app est servie sous basePath /pay. En middleware, request.nextUrl.pathname est déjà dépouillé
// du basePath, MAIS NextResponse.redirect(new URL("/x", request.url)) ne le remet PAS → il faut
// préfixer /pay explicitement, sinon la redirection part sur kernel-core.yowyob.com/x (le Kernel).
const BASE_PATH = "/pay";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/tenants",
  "/organizations",
  "/direct-payment",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(getAccessTokenCookieName())?.value;
  const tenantId = request.cookies.get(getTenantIdCookieName())?.value;

  const redirect = (path: string) =>
    NextResponse.redirect(new URL(`${BASE_PATH}${path}`, request.url));

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/direct-payment") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next");

  if (isPublic) {
    // Déjà connecté et sur /login : on saute la page de connexion.
    if (
      accessToken &&
      pathname === "/login" &&
      !request.nextUrl.searchParams.get("step")
    ) {
      return tenantId ? redirect("/console") : redirect("/tenants");
    }
    return NextResponse.next();
  }

  // Pages protégées : il faut un token + un tenant. L'ORGANISATION est OPTIONNELLE (les comptes à
  // wallet personnel n'en ont pas — on ne doit pas les bloquer).
  if (!accessToken) {
    return redirect("/login");
  }
  if (!tenantId && pathname !== "/tenants") {
    return redirect("/tenants");
  }
  if (tenantId && pathname === "/tenants") {
    return redirect("/console");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
