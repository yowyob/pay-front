import { toBffResponse } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";

export async function GET(request: Request) {
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/plans");
  return toBffResponse(result);
}
