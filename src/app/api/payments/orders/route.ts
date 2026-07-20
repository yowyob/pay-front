import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { getIwmEnv } from "@/lib/env";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { withPaymentCallbacks } from "@/lib/payment-callback";
import type { components } from "@/types/schemas-payment";

type InitiatePaymentRequest = components["schemas"]["InitiatePaymentRequest"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/payments/orders", {
    params: {
      query: limit !== undefined && !Number.isNaN(limit) ? { limit } : undefined,
    },
  });
  return toBffResponse(result);
}

export async function POST(request: Request) {
  const body = await readJsonBody<InitiatePaymentRequest>(request);
  const { clientId, payerReference } = getIwmEnv();
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/payments/orders", {
    body: withPaymentCallbacks({
      ...(body ?? {}),
      clientId: body?.clientId ?? clientId,
      payerReference: body?.payerReference ?? payerReference,
    }),
  });
  return toBffResponse(result);
}
