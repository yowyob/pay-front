import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type UpdateAvatarRequest = components["schemas"]["UpdateAvatarRequest"];

export async function PUT(request: Request) {
  const body = await readJsonBody<UpdateAvatarRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.PUT("/api/users/me/avatar", { body: asJsonBody(body) });
  return toBffResponse(result);
}
