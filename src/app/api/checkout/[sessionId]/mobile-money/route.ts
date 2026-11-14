import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

/**
 * Ouvre le règlement par mobile money d'un achat, pour un acheteur SANS compte Yowyob.
 *
 * Le chemin amont est `guest-checkout` et non `checkout-sessions` : c'est le seul que le noyau
 * laisse public, parce qu'il ne suppose ni session, ni portefeuille, ni code de validation. Un
 * client de passage n'a rien de tout cela.
 *
 * Un second appel rend le MÊME lien : le noyau conserve l'encaissement ouvert. Un rechargement de
 * page ne doit pas ouvrir un deuxième paiement que l'acheteur pourrait régler deux fois.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const body = await readJsonBody<unknown>(request);
  const result = await postIwmJson(
    request,
    `/api/payments/guest-checkout/${encodeURIComponent(sessionId)}/mobile-money`,
    body,
  );
  return toBffResponse(result);
}
