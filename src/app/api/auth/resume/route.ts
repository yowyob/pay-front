import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import {
  applySessionCookies,
  getSessionFromRequest,
} from "@/lib/session-cookies";
import type { components } from "@/types/schemas-auth";
import { NextResponse, type NextRequest } from "next/server";

type RefreshTokenResponse = components["schemas"]["RefreshTokenResponse"];
type ApiResponseRefreshTokenResponse =
  components["schemas"]["ApiResponseRefreshTokenResponse"];

/** Chemin interne sûr : commence par « / », jamais « // » (redirection vers un autre site). */
function safeReturnTo(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/console";
}

/**
 * Reprise de session. Le jeton d'accès vit 15 min ; le proxy envoyait à la connexion dès qu'il
 * avait expiré, alors que le jeton de rafraîchissement (14 jours) était encore là — un acheteur
 * revenu sur la caisse devait se reconnecter. Le proxy passe désormais ici : on rafraîchit, puis
 * on ramène à la page demandée ; la connexion n'est demandée que si le rafraîchissement échoue.
 */
/** Adresse publique (hôte et basePath de nextUrl, comme le proxy), jamais l'adresse interne. */
function pageUrl(request: NextRequest, path: string, query?: Record<string, string>) {
  const url = request.nextUrl.clone();
  const [pathname, search] = path.split("?");
  url.pathname = pathname;
  url.search = search ? `?${search}` : "";
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const loginUrl = pageUrl(request, "/login", { returnTo });

  const session = getSessionFromRequest(request);
  if (!session.refreshToken || !session.tenantId) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const client = createIwmAuthClient(request);
    const result = await client.POST("/api/auth/refresh", {
      body: { refreshToken: session.refreshToken },
    });
    const payload = result.data as ApiResponseRefreshTokenResponse | undefined;
    const refreshed = payload?.data as RefreshTokenResponse | undefined;
    if (!result.response.ok || !refreshed?.accessToken) {
      return NextResponse.redirect(loginUrl);
    }
    const response = NextResponse.redirect(pageUrl(request, returnTo));
    applySessionCookies(response, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessExpiresInSeconds: refreshed.accessExpiresInSeconds,
      refreshExpiresInSeconds: refreshed.refreshExpiresInSeconds,
    });
    return response;
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}
