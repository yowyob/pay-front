import { getIwmEnv } from "./env";
import { buildIwmRequestHeaders } from "./iwm-headers";

/**
 * Appel direct au kernel pour les routes absentes des types générés (`schemas-payment.d.ts`
 * est figé à la dernière génération). Même en-têtes et même base d'URL que le client typé :
 * seule la vérification de type au build est perdue, pas la sécurité.
 */
export async function postIwmJson(
  request: Request,
  path: string,
  body: unknown,
): Promise<{ data: unknown; response: Response }> {
  const { baseUrl } = getIwmEnv();
  const headers = new Headers(buildIwmRequestHeaders(request));
  headers.set("content-type", "application/json");

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const text = await response.text();
  const data = text.trim() ? (JSON.parse(text) as unknown) : null;
  return { data, response };
}
