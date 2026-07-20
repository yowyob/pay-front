import { asJsonBody, readJsonBody } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import {
    clearSessionCookies,
    getSessionFromRequest,
} from "@/lib/session-cookies";
import type { components } from "@/types/schemas-auth";
import { NextResponse } from "next/server";

type RefreshTokenRequest = components["schemas"]["RefreshTokenRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<RefreshTokenRequest>(request);
  const session = getSessionFromRequest(request);
  const refreshToken = body?.refreshToken ?? session.refreshToken;

  const client = createIwmAuthClient(request);
  if (refreshToken) {
    await client.POST("/api/auth/logout", {
      body: asJsonBody({ refreshToken }),
    });
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
