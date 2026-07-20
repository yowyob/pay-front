import { asJsonBody, readJsonBody } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { extractLoginSession } from "@/lib/login-session";
import {
  applySessionCookies,
  getSessionFromRequest,
} from "@/lib/session-cookies";
import type { components } from "@/types/schemas-auth";
import { NextResponse } from "next/server";

type SelectLoginContextRequest =
  components["schemas"]["SelectLoginContextRequest"];
type ApiResponseContextualLoginResponse =
  components["schemas"]["ApiResponseContextualLoginResponse"];
type LoginResponse = components["schemas"]["LoginResponse"];

export async function POST(request: Request) {
  const body = await readJsonBody<SelectLoginContextRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/select-context", {
    body: asJsonBody(body),
  });

  const payload = (result.data ?? result.error) as
    | ApiResponseContextualLoginResponse
    | undefined;
  const response = NextResponse.json(payload ?? null, {
    status: result.response.status,
  });

  const contextual = payload?.data;
  const session = contextual?.session as LoginResponse | undefined;
  const sessionCookies = extractLoginSession(session);
  const requestSession = getSessionFromRequest(request);

  const preservedAccessToken =
    sessionCookies?.accessToken ??
    (requestSession.authorization?.startsWith("Bearer ")
      ? requestSession.authorization.slice(7)
      : undefined);

  applySessionCookies(response, {
    accessToken: preservedAccessToken,
    refreshToken: sessionCookies?.refreshToken ?? requestSession.refreshToken,
    actorId: sessionCookies?.actorId ?? requestSession.actorId,
    organizationId: contextual?.selectedOrganizationId,
    tenantId: contextual?.selectedTenantId ?? requestSession.tenantId,
    accessExpiresInSeconds: sessionCookies?.accessExpiresInSeconds,
    refreshExpiresInSeconds: sessionCookies?.refreshExpiresInSeconds,
  });

  return response;
}
