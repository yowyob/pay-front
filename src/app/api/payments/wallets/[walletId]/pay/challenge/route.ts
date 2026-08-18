import { readJsonBody, toBffResponse } from "@/lib/bff-utils";
import { postIwmJson } from "@/lib/iwm-raw-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  const { walletId } = await params;
  const body = await readJsonBody<unknown>(request);
  const result = await postIwmJson(
    request,
    `/api/payments/wallets/${walletId}/pay/challenge`,
    body,
  );
  return toBffResponse(result);
}
