import { readJsonBody } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import {
    applySessionCookies,
    getSessionFromRequest,
} from "@/lib/session-cookies";
import type { components } from "@/types/schemas-auth";
import { NextResponse } from "next/server";

type RefreshTokenRequest = components["schemas"]["RefreshTokenRequest"];
type RefreshTokenResponse = components["schemas"]["RefreshTokenResponse"];
type ApiResponseRefreshTokenResponse =
  components["schemas"]["ApiResponseRefreshTokenResponse"];

export async function POST(request: Request) {
  const body = await readJsonBody<RefreshTokenRequest>(request);
  const session = getSessionFromRequest(request);
  const refreshToken = body?.refreshToken ?? session.refreshToken;

  if (!refreshToken) {
    return NextResponse.json(
      { message: "refreshToken requis", errorCode: "MISSING_REFRESH_TOKEN" },
      { status: 401 },
    );
  }

  if (!session.tenantId) {
    return NextResponse.json({
      success: true,
      data: null,
      message: "Tenant non sélectionné, refresh ignoré",
    });
  }

  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/refresh", {
    body: { refreshToken },
  });

  const payload = (result.data ?? result.error) as
    | ApiResponseRefreshTokenResponse
    | undefined;
  const response = NextResponse.json(payload ?? null, {
    status: result.response.status,
  });

  const refreshData = payload?.data as RefreshTokenResponse | undefined;
  if (result.response.ok && refreshData?.accessToken) {
    applySessionCookies(response, {
      accessToken: refreshData.accessToken,
      refreshToken: refreshData.refreshToken,
      accessExpiresInSeconds: refreshData.accessExpiresInSeconds,
      refreshExpiresInSeconds: refreshData.refreshExpiresInSeconds,
    });
  }

  return response;
}
