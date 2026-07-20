import { asJsonBody, readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import type { components } from "@/types/schemas-payment";

type CommercialPlanQuoteRequest =
  components["schemas"]["CommercialPlanQuoteRequest"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planCode: string }> },
) {
  const { planCode } = await params;
  const body = await readJsonBody<CommercialPlanQuoteRequest>(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/commercial-plans/{planCode}/quote", {
    params: { path: { planCode } },
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
