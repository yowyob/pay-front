import { asJsonBody, readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import type { components } from "@/types/schemas-payment";

type ServiceBundleQuoteRequest =
  components["schemas"]["ServiceBundleQuoteRequest"];

export async function POST(request: Request) {
  const body = await readJsonBody<ServiceBundleQuoteRequest>(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/service-bundles/quote", {
    body: asJsonBody(body),
  });
  return toBffResponse(result);
}
