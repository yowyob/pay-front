import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/service-bundles/orders/{orderId}", {
    params: { path: { orderId } },
  });
  return toBffResponse(result);
}
