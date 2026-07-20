import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type ChangePasswordRequest = components["schemas"]["ChangePasswordRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<ChangePasswordRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/change-password", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
