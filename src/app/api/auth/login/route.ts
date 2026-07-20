import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type LoginRequest = components["schemas"]["LoginRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<LoginRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/login", { body: asJsonBody(body) });
  return toBffResponse(result);
}
