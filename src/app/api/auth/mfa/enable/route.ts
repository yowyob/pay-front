import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type EnableMfaRequest = components["schemas"]["EnableMfaRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<EnableMfaRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/mfa/enable", { body: asJsonBody(body) });
  return toBffResponse(result);
}
