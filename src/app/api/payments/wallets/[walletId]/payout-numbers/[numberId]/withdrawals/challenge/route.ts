import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

/** Code de validation d'un retrait vers ce numéro vérifié. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ walletId: string; numberId: string }> },
) {
  const { walletId, numberId } = await params;
  const body = await readJsonBody<unknown>(request);
  const result = await postIwmJson(
    request,
    `/api/payments/wallets/${encodeURIComponent(walletId)}/payout-numbers/${encodeURIComponent(numberId)}/withdrawals/challenge`,
    body,
  );
  return toBffResponse(result);
}
