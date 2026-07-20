import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { toBffResponse } from "@/lib/bff-utils";

export async function GET(request: Request) {
  const client = createIwmAuthClient(request);
  const result = await client.GET("/api/users/me");
  return toBffResponse(result);
}
