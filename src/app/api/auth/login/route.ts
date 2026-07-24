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

type LoginRequest = components["schemas"]["LoginRequest"];
type LoginResponse = components["schemas"]["LoginResponse"];
type ApiResponseLoginResponse =
  components["schemas"]["ApiResponseLoginResponse"];

export async function POST(request: Request) {
  const body =
    (await readJsonBody<LoginRequest & { tenantId?: string }>(request)) ??
    ({} as LoginRequest & { tenantId?: string });
  const session = getSessionFromRequest(request);

  // Le tenant peut venir du cookie (select-context) OU du corps (fallback popup/redirect, où le
  // cookie ne se propage pas toujours). On le transmet ensuite explicitement au Kernel.
  const { tenantId: bodyTenantId, ...loginBody } = body;
  const tenantId = session.tenantId ?? bodyTenantId;

  if (!tenantId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Tenant requis : appelez d'abord /api/auth/discover-contexts puis sélectionnez un tenant avant de vous connecter.",
        errorCode: "TENANT_REQUIRED",
      },
      { status: 400 },
    );
  }

  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/login", {
    body: asJsonBody(loginBody),
    headers: { "X-Tenant-Id": tenantId },
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
