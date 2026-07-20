import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { toBffResponse } from "@/lib/bff-utils";

export async function POST(request: Request) {
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/mfa/disable");
  return toBffResponse(result);
}
