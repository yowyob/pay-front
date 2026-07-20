import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type UpdateOnboardingRequest = components["schemas"]["UpdateOnboardingRequest"];

export async function PUT(request: Request) {
  const body = await readJsonBody<UpdateOnboardingRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.PUT("/api/users/me/onboarding", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
