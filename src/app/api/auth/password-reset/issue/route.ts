import type { components } from "@/types/schemas-auth";
import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { readJsonBody, asJsonBody, toBffResponse } from "@/lib/bff-utils";

type IssuePasswordResetRequest =
  components["schemas"]["IssuePasswordResetRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<IssuePasswordResetRequest>(request);
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/password-reset/issue", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
