import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { getSessionFromRequest } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";

type ApiResponseWalletResponse =
  components["schemas"]["ApiResponseWalletResponse"];
type WalletResponse = components["schemas"]["WalletResponse"];

export {
    buildWalletRechargeDescription,
    formatMycoolpayLabel,
    formatPaymentDescription
} from "@/lib/wallet-labels";

function parseWalletResponse(
  data: ApiResponseWalletResponse | undefined,
): WalletResponse | null {
  return data?.data ?? null;
}

export async function getWalletById(
  request: Request,
  walletId: string,
): Promise<WalletResponse | null> {
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/payments/wallets/{walletId}", {
    params: { path: { walletId } },
  });

  return parseWalletResponse(
    result.data as ApiResponseWalletResponse | undefined,
  );
}

export async function getWalletFromSession(
  request: Request,
): Promise<WalletResponse | null> {
  const session = getSessionFromRequest(request);
  if (!session.walletId) {
    return null;
  }

  return getWalletById(request, session.walletId);
}
