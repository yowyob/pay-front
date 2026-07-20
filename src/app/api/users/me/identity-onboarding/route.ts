import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type UpdateIdentityOnboardingRequest =
  components["schemas"]["UpdateIdentityOnboardingRequest"];

export async function PUT(request: Request) {
  const body = await readJsonBody<UpdateIdentityOnboardingRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.PUT("/api/users/me/identity-onboarding", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
