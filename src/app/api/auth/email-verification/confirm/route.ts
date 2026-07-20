import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type ConfirmEmailVerificationRequest =
  components["schemas"]["ConfirmEmailVerificationRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<ConfirmEmailVerificationRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/email-verification/confirm", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
