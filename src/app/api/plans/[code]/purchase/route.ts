import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import type { components } from "@/types/schemas-payment";

type PurchaseRequest = components["schemas"]["PurchaseRequest"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await readJsonBody<PurchaseRequest>(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/plans/{code}/purchase", {
    params: { path: { code } },
    body,
  });
  return toBffResponse(result);
}
