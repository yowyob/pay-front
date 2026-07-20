import { asJsonBody, readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { getIwmEnv } from "@/lib/env";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { withPaymentCallbacks } from "@/lib/payment-callback";
import { getSessionFromRequest } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";

type ServiceBundleCheckoutRequest =
  components["schemas"]["ServiceBundleCheckoutRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<ServiceBundleCheckoutRequest>(request);
  const { clientId, payerReference } = getIwmEnv();
  const session = getSessionFromRequest(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/service-bundles/checkout", {
    body: withPaymentCallbacks({
      ...asJsonBody(body),
      clientId: body?.clientId ?? clientId,
      payerReference: body?.payerReference ?? payerReference,
      organizationId: body?.organizationId ?? session.organizationId,
    }),
  });
  return toBffResponse(result);
}
