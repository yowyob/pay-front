import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type ConfirmMfaRequest = components["schemas"]["ConfirmMfaRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<ConfirmMfaRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/phone-verification/confirm", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
