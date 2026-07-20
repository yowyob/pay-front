import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

export async function POST(request: Request) {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/email-verification/resend", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
