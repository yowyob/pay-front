import type { components } from "@/types/schemas-auth";
import type { SessionCookieData } from "@/lib/session-cookies";

type LoginResponse = components["schemas"]["LoginResponse"];

export function extractLoginSession(
  loginData: LoginResponse | undefined,
): SessionCookieData | null {
  if (!loginData) {
    return null;
  }

  const accessToken = loginData.accessToken ?? loginData.sessionToken;
  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken: loginData.refreshToken,
    actorId: loginData.actorId,
    tenantId: loginData.tenantId,
    accessExpiresInSeconds: loginData.expiresInSeconds,
    refreshExpiresInSeconds: loginData.refreshExpiresInSeconds,
  };
}
