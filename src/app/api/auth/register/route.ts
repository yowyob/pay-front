import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type RegisterUserRequest = components["schemas"]["RegisterUserRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<RegisterUserRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/register", { body: asJsonBody(body) });
  return toBffResponse(result);
}
