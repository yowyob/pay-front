import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type IdentifyAccountRequest = components["schemas"]["IdentifyAccountRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<IdentifyAccountRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/identify", { body: asJsonBody(body) });
  return toBffResponse(result);
}
