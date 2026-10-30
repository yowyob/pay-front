import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

/** Étape 2 : débit du portefeuille et activation du plan, ensemble ou pas du tout. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ planCode: string }> },
) {
  const { planCode } = await params;
  const body = await readJsonBody<unknown>(request);
  const result = await postIwmJson(
    request,
    `/api/commercial-plans/${encodeURIComponent(planCode)}/wallet-checkout`,
    body,
  );
  return toBffResponse(result);
}
