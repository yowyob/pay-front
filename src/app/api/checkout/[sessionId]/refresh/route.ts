import { toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

/**
 * Relit l'issue du règlement chez le prestataire.
 *
 * L'acheteur paie sur la page de MyCoolPay, dans un autre onglet : aucune de nos pages n'est
 * rechargée au moment où il valide. C'est donc cette page qui interroge, et c'est ce qui lui dit
 * que l'achat est réglé.
 *
 * Le noyau impose un intervalle minimal entre deux relectures réelles (3 s par défaut) : en deçà,
 * il rend l'état déjà connu sans rappeler le prestataire. Interroger plus souvent ne sert à rien.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const result = await postIwmJson(
    request,
    `/api/payments/guest-checkout/${encodeURIComponent(sessionId)}/refresh`,
    {},
  );
  return toBffResponse(result);
}
