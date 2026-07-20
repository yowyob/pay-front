import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const { searchParams } = new URL(request.url);
  const amountParam = searchParams.get("amount");

  if (!amountParam) {
    return toBffResponse({
      error: { message: "Query parameter 'amount' is required" },
      response: new Response(null, { status: 400 }),
    });
  }

  const amount = Number(amountParam);
  if (Number.isNaN(amount)) {
    return toBffResponse({
      error: { message: "Query parameter 'amount' must be a number" },
      response: new Response(null, { status: 400 }),
    });
  }

  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/payments/wallets/{walletId}/can-operate", {
    params: {
      path: { walletId },
      query: { amount },
    },
  });
  return toBffResponse(result);
}
