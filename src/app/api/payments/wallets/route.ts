import { readJsonBody } from "@/lib/bff-utils";
import { createIwmPaymentClient } from "@/lib/iwm-payment-client";
import { applySessionCookies } from "@/lib/session-cookies";
import type { components } from "@/types/schemas-payment";
import { NextResponse } from "next/server";

type CreateWalletRequest = components["schemas"]["CreateWalletRequest"];
type ApiResponseWalletResponse =
  components["schemas"]["ApiResponseWalletResponse"];

export async function POST(request: Request) {
  const body = await readJsonBody<CreateWalletRequest>(request);
  const client = createIwmPaymentClient(request);
  const result = await client.POST("/api/payments/wallets", { body });

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
