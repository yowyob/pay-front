import { asJsonBody, readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { getIwmEnv } from "@/lib/env";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { withPaymentCallbacks } from "@/lib/payment-callback";
import type { components } from "@/types/schemas-payment";

type WalletRechargeRequest = components["schemas"]["WalletRechargeRequest"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const body = await readJsonBody<WalletRechargeRequest>(request);
  const { clientId, payerReference } = getIwmEnv();

  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/payments/wallets/{walletId}/recharge", {
    params: { path: { walletId } },
    body: withPaymentCallbacks({
      ...asJsonBody(body),
      clientId: body?.clientId ?? clientId,
      payerReference: body?.payerReference ?? payerReference,
      currency: body?.currency ?? "XAF",
    }),
  });
  return toBffResponse(result);
}
