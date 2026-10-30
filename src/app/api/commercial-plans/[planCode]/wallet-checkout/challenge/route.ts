import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

/** Achat d'un plan par le portefeuille de l'organisation, étape 1 : le noyau envoie le code. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ planCode: string }> },
) {
  const { planCode } = await params;
  const body = await readJsonBody<unknown>(request);
  const result = await postIwmJson(
    request,
    `/api/commercial-plans/${encodeURIComponent(planCode)}/wallet-checkout/challenge`,
    body,
  );
  return toBffResponse(result);
}
