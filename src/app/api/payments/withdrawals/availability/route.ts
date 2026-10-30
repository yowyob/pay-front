import { toBffResponse } from "@/lib/bff-utils";
import { getIwmJson } from "@/lib/iwm-raw-client";

/** Le retrait vers mobile money est-il ouvert (versement du prestataire configuré) ? */
export async function GET(request: Request) {
  const result = await getIwmJson(request, "/api/payments/withdrawals/availability");
  return toBffResponse(result);
}
