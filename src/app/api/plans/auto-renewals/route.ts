import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { getSessionFromRequest } from "@/lib/session-cookies";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session = getSessionFromRequest(request);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const organizationId =
    searchParams.get("organizationId") ?? session.organizationId ?? undefined;

  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/plans/auto-renewals", {
    params: {
      query: {
        ...(organizationId ? { organizationId } : {}),
        ...(limit !== undefined && !Number.isNaN(limit) ? { limit } : {}),
      },
    },
  });
  return toBffResponse(result);
}
