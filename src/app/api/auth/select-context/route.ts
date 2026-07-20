import { asJsonBody, readJsonBody } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { applySessionCookies } from "@/lib/session-cookies";
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

  applySessionCookies(response, {
    accessToken: session?.accessToken,
    refreshToken: session?.refreshToken,
    actorId: session?.actorId,
    organizationId: contextual?.selectedOrganizationId,
    accessExpiresInSeconds: session?.expiresInSeconds,
    refreshExpiresInSeconds: session?.refreshExpiresInSeconds,
  });

  return response;
}
