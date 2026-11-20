import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { getIwmJson, postIwmJson } from "@/lib/iwm-raw-client";

type Params = { params: Promise<{ walletId: string }> };

function kernelPath(walletId: string) {
  return `/api/payments/wallets/${encodeURIComponent(walletId)}/payout-numbers`;
}

/** Numéros de retrait du portefeuille, toujours masqués par le kernel. */
export async function GET(request: Request, { params }: Params) {
  const { walletId } = await params;
  return toBffResponse(await getIwmJson(request, kernelPath(walletId)));
}

/** Ajoute un numéro : le kernel envoie un code par SMS à ce numéro. */
export async function POST(request: Request, { params }: Params) {
  const { walletId } = await params;
  const body = await readJsonBody<unknown>(request);
  return toBffResponse(await postIwmJson(request, kernelPath(walletId), body));
}
