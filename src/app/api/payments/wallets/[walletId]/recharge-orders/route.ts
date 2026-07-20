import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const client = createIwmPaymentClient(request);
  const result = await client.GET(
    "/api/payments/wallets/{walletId}/recharge-orders",
    {
      params: {
        path: { walletId },
        query:
          limit !== undefined && !Number.isNaN(limit) ? { limit } : undefined,
      },
    },
  );
  return toBffResponse(result);
}
