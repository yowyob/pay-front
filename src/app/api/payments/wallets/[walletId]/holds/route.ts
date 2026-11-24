import { toBffResponse } from "@/lib/bff-utils";
import { getIwmJson } from "@/lib/iwm-raw-client";

/** Fonds gelés du portefeuille (total et détail), en lecture pour son titulaire. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const result = await getIwmJson(
    request,
    `/api/payments/wallets/${encodeURIComponent(walletId)}/holds`,
  );
  return toBffResponse(result);
}
