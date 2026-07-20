import { asJsonBody, readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import type { components } from "@/types/schemas-payment";

type CommercialPlanQuoteRequest =
  components["schemas"]["CommercialPlanQuoteRequest"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: planCode } = await params;
  const body = await readJsonBody<CommercialPlanQuoteRequest>(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/plans/{planCode}/quote", {
    params: { path: { planCode } },
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
