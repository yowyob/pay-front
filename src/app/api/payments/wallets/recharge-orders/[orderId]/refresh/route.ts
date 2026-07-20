import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.POST(
    "/api/payments/wallets/recharge-orders/{orderId}/refresh",
    {
      params: { path: { orderId } },
    },
  );
  return toBffResponse(result);
}
