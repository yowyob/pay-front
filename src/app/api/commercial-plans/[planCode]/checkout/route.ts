import { asJsonBody, readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { getIwmEnv } from "@/lib/env";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { withPaymentCallbacks } from "@/lib/payment-callback";
import { getSessionFromRequest } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";

type CommercialPlanCheckoutRequest =
  components["schemas"]["CommercialPlanCheckoutRequest"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planCode: string }> },
) {
  const { planCode } = await params;
  const body = await readJsonBody<CommercialPlanCheckoutRequest>(request);
  const { clientId, payerReference } = getIwmEnv();
  const session = getSessionFromRequest(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/commercial-plans/{planCode}/checkout", {
    params: { path: { planCode } },
    body: withPaymentCallbacks({
      ...asJsonBody(body),
      clientId: body?.clientId ?? clientId,
      payerReference: body?.payerReference ?? payerReference,
      organizationId: body?.organizationId ?? session.organizationId,
    }),
  });
  return toBffResponse(result);
}
