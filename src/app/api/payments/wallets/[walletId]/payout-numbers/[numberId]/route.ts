import { toBffResponse } from "@/lib/bff-utils";
import { deleteIwmJson } from "@/lib/iwm-raw-client";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ walletId: string; numberId: string }> },
) {
  const { walletId, numberId } = await params;
  const result = await deleteIwmJson(
    request,
    `/api/payments/wallets/${encodeURIComponent(walletId)}/payout-numbers/${encodeURIComponent(numberId)}`,
  );
  return toBffResponse(result);
}
