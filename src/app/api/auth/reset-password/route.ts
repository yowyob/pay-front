import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type ResetPasswordRequest = components["schemas"]["ResetPasswordRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<ResetPasswordRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/reset-password", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
