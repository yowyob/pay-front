import { asJsonBody, readJsonBody } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { IWM_PRE_AUTH_HEADERS } from "@/lib/iwm-headers";
import type { components } from "@/types/schemas-auth";
import { NextResponse } from "next/server";

type LoginRequest = components["schemas"]["LoginRequest"];
type ApiResponseDiscoverLoginContextsResponse =
  components["schemas"]["ApiResponseDiscoverLoginContextsResponse"];

export async function POST(request: Request) {
  const body = await readJsonBody<LoginRequest>(request);
  const client = createIwmAuthClient(request, IWM_PRE_AUTH_HEADERS);
  const result = await client.POST("/api/auth/discover-contexts", {
    body: asJsonBody(body),
  });

  const payload = (result.data ?? result.error) as
    | ApiResponseDiscoverLoginContextsResponse
    | undefined;

  return NextResponse.json(payload ?? null, {
    status: result.response.status,
  });
}
