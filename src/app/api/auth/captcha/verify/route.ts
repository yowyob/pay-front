import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type VerifyCaptchaRequest = components["schemas"]["VerifyCaptchaRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<VerifyCaptchaRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/captcha/verify", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
