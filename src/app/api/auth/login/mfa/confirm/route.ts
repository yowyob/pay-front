import { asJsonBody, readJsonBody } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { applySessionCookies } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-auth";
import { NextResponse } from "next/server";

type ConfirmMfaLoginRequest = components["schemas"]["ConfirmMfaLoginRequest"];
type LoginResponse = components["schemas"]["LoginResponse"];
type ApiResponseLoginResponse =
  components["schemas"]["ApiResponseLoginResponse"];

export async function POST(request: Request) {
  const body = await readJsonBody<ConfirmMfaLoginRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/login/mfa/confirm", {
    body: asJsonBody(body),
  });

  const payload = (result.data ?? result.error) as
    | ApiResponseLoginResponse
    | undefined;
  const response = NextResponse.json(payload ?? null, {
    status: result.response.status,
  });

  const loginData = payload?.data as LoginResponse | undefined;
  if (loginData?.accessToken) {
    applySessionCookies(response, {
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
      actorId: loginData.actorId,
      accessExpiresInSeconds: loginData.expiresInSeconds,
      refreshExpiresInSeconds: loginData.refreshExpiresInSeconds,
    });
  }

  return response;
}
