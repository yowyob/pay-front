import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type ForgotPasswordRequest = components["schemas"]["ForgotPasswordRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<ForgotPasswordRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/forgot-password", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
