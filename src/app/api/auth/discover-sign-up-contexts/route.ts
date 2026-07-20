import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { IWM_PRE_AUTH_HEADERS } from "@/lib/iwm-headers";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type DiscoverSignUpContextsRequest =
  components["schemas"]["DiscoverSignUpContextsRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<DiscoverSignUpContextsRequest>(request);
  const client = createIwmAuthClient(request, IWM_PRE_AUTH_HEADERS);
  const result = await client.POST("/api/auth/discover-sign-up-contexts", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
