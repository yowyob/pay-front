import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const body = await readJsonBody<unknown>(request);
  const result = await postIwmJson(
    request,
    `/api/payments/checkout-sessions/${encodeURIComponent(sessionId)}/confirm`,
    body,
  );
  return toBffResponse(result);
}
