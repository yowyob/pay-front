import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type UpdatePlanRequest = components["schemas"]["UpdatePlanRequest"];

export async function PUT(request: Request) {
  const body = await readJsonBody<UpdatePlanRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.PUT("/api/users/me/plan", { body: asJsonBody(body) });
  return toBffResponse(result);
}
