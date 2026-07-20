import { asJsonBody, readJsonBody } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { extractLoginSession } from "@/lib/login-session";
import {
  applySessionCookies,
  clearOrganizationCookie,
  getSessionFromRequest,
} from "@/lib/session-cookies";
import type { components } from "@/types/schemas-auth";
import { NextResponse } from "next/server";

type ConfirmMfaLoginRequest = components["schemas"]["ConfirmMfaLoginRequest"];
type LoginResponse = components["schemas"]["LoginResponse"];
type ApiResponseLoginResponse =
  components["schemas"]["ApiResponseLoginResponse"];

export async function POST(request: Request) {
  const body = await readJsonBody<ConfirmMfaLoginRequest>(request);
  const session = getSessionFromRequest(request);

  if (!session.tenantId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Tenant requis : sélectionnez un tenant avant de confirmer le code MFA.",
        errorCode: "TENANT_REQUIRED",
      },
      { status: 400 },
    );
  }

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
  const sessionCookies = extractLoginSession(loginData);
  if (result.response.ok && sessionCookies) {
    clearOrganizationCookie(response);
    applySessionCookies(response, sessionCookies);
  }

  return response;
}
