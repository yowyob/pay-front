import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/payments/orders/{id}", {
    params: { path: { id } },
  });
  return toBffResponse(result);
}
