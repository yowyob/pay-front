import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type VerifyOtpRequest = components["schemas"]["VerifyOtpRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<VerifyOtpRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/otp/verify", { body: asJsonBody(body) });
  return toBffResponse(result);
}
