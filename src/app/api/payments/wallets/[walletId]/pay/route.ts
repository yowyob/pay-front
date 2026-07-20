import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import type { components } from "@/types/schemas-payment";

type TransactionRequest = components["schemas"]["TransactionRequest"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const body = await readJsonBody<TransactionRequest>(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/payments/wallets/{walletId}/pay", {
    params: { path: { walletId } },
    body: body ?? {},
  });
  return toBffResponse(result);
}
