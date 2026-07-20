import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/service-bundles/orders", {
    params: {
      query: limit !== undefined && !Number.isNaN(limit) ? { limit } : undefined,
    },
  });
  return toBffResponse(result);
}
