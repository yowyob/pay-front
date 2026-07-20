import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/payments/wallets/{walletId}/transactions", {
    params: { path: { walletId } },
  });
  return toBffResponse(result);
}
