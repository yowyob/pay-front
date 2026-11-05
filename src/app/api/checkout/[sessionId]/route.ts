import { toBffResponse } from "@/lib/bff-utils";
import { getIwmJson } from "@/lib/iwm-raw-client";

/** Achat proposé par une plateforme Yowyob, tel que l'acheteur le voit. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const result = await getIwmJson(
    request,
    `/api/payments/checkout-sessions/${encodeURIComponent(sessionId)}/view`,
  );
  return toBffResponse(result);
}
