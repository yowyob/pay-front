import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/payments/orders/{id}/refresh", {
    params: { path: { id } },
  });
  return toBffResponse(result);
}
