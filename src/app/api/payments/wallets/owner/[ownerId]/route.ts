import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { applySessionCookies } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";
import { NextResponse } from "next/server";

type ApiResponseWalletResponse =
  components["schemas"]["ApiResponseWalletResponse"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ownerId: string }> },
) {
  const { ownerId } = await params;
  const client = createIwmPaymentClient(request);
  const result = await client.GET("/api/payments/wallets/owner/{ownerId}", {
    params: { path: { ownerId } },
  });

  const payload = (result.data ?? result.error) as
    | ApiResponseWalletResponse
    | undefined;
  const response = NextResponse.json(payload ?? null, {
    status: result.response.status,
  });

  if (payload?.data?.id) {
    applySessionCookies(response, { walletId: payload.data.id });
  }

  return response;
}
