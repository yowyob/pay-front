import { toBffResponse } from "@/lib/bff-utils";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";

export async function GET(request: Request) {
  const client = createIwmAuthClient(request);
  const result = await client.GET("/api/auth/me/memberships");
  return toBffResponse(result);
}
