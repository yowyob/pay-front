import { createIwmAuthClient } from "@/lib/iwm-auth-client";
import { toBffResponse } from "@/lib/bff-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const client = createIwmAuthClient(request);
  const result = await client.POST("/api/auth/users/{userId}/reset-password", {
    params: { path: { userId } },
  });
  return toBffResponse(result);
}
