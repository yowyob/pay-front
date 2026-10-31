import { toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

/** Code de réception jetable (10 minutes, un seul transfert) à communiquer à l'expéditeur. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const result = await postIwmJson(
    request,
    `/api/payments/wallets/${encodeURIComponent(walletId)}/receive-codes`,
    {},
  );
  return toBffResponse(result);
}
