import { NextResponse } from "next/server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export type SessionCookieData = {
  accessToken?: string;
  refreshToken?: string;
  accessExpiresInSeconds?: number;
  refreshExpiresInSeconds?: number;
  organizationId?: string;
  actorId?: string;
  walletId?: string;
  tenantId?: string;
};

function cookieMaxAge(seconds?: number) {
  if (seconds == null || seconds <= 0) {
    return undefined;
  }
  return seconds;
}

export function getCookieNames() {
  return {
    accessToken:
      process.env.COOKIE_ACCESS_TOKEN?.trim() || "yy_pay_access_token",
    refreshToken:
      process.env.COOKIE_REFRESH_TOKEN?.trim() || "yy_pay_refresh_token",
    organizationId:
      process.env.COOKIE_ORGANIZATION_ID?.trim() || "yy_pay_organization_id",
    walletId: process.env.COOKIE_WALLET_ID?.trim() || "yy_pay_wallet_id",
    actorId: process.env.COOKIE_ACTOR_ID?.trim() || "yy_pay_actor_id",
    tenantId: process.env.COOKIE_TENANT_ID?.trim() || "yy_pay_tenant_id",
  };
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) {
          return [part, ""];
        }
        return [
          part.slice(0, separator),
          decodeURIComponent(part.slice(separator + 1)),
        ];
      }),
  );
}

export function getSessionFromRequest(request: Request) {
  const names = getCookieNames();
  const cookies = parseCookieHeader(request.headers.get("cookie") ?? "");
  const accessToken = cookies[names.accessToken];
  const headerAuth = request.headers.get("Authorization");

  return {
    authorization: accessToken
      ? `Bearer ${accessToken}`
      : headerAuth ?? undefined,
    organizationId: cookies[names.organizationId],
    actorId: cookies[names.actorId],
    walletId: cookies[names.walletId],
    refreshToken: cookies[names.refreshToken],
    tenantId: cookies[names.tenantId],
  };
}

export function applySessionCookies(
  response: NextResponse,
  data: SessionCookieData,
) {
  const names = getCookieNames();

  if (data.accessToken) {
    response.cookies.set(names.accessToken, data.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: cookieMaxAge(data.accessExpiresInSeconds),
    });
  }
  if (data.refreshToken) {
    response.cookies.set(names.refreshToken, data.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: cookieMaxAge(data.refreshExpiresInSeconds),
    });
  }
  if (data.organizationId) {
    response.cookies.set(
      names.organizationId,
      data.organizationId,
      COOKIE_OPTIONS,
    );
  }
  if (data.actorId) {
    response.cookies.set(names.actorId, data.actorId, COOKIE_OPTIONS);
  }
  if (data.walletId) {
    response.cookies.set(names.walletId, data.walletId, COOKIE_OPTIONS);
  }
  if (data.tenantId) {
    response.cookies.set(names.tenantId, data.tenantId, COOKIE_OPTIONS);
  }

  return response;
}

export function clearSessionCookies(response: NextResponse) {
  const names = getCookieNames();
  for (const name of Object.values(names)) {
    response.cookies.set(name, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  }
  return response;
}

export function clearOrganizationCookie(response: NextResponse) {
  const names = getCookieNames();
  response.cookies.set(names.organizationId, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}

export function clearTenantAndOrganizationCookies(response: NextResponse) {
  const names = getCookieNames();
  response.cookies.set(names.tenantId, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(names.organizationId, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}

export function getAccessTokenCookieName() {
  return getCookieNames().accessToken;
}

export function getRefreshTokenCookieName() {
  return getCookieNames().refreshToken;
}

export function getOrganizationIdCookieName() {
  return getCookieNames().organizationId;
}

export function getTenantIdCookieName() {
  return getCookieNames().tenantId;
}
