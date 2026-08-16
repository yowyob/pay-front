import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { refreshRecharge } from "@/lib/wallet-kernel";

/** Confirme une recharge : le kernel crédite le wallet si le paiement provider a réussi. */
export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session.authorization) {
    return NextResponse.json(
      { message: "Authentification requise", errorCode: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let orderId: string | undefined;
  try {
    const body = (await request.json()) as { orderId?: string };
    orderId = body?.orderId;
  } catch {
    orderId = undefined;
  }
  if (!orderId) {
    return NextResponse.json(
      { message: "orderId requis", errorCode: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const result = await refreshRecharge(request, orderId);
  if (!result.ok || !result.data) {
    return NextResponse.json(
      { message: result.message || "Confirmation impossible", errorCode: "REFRESH_ERROR" },
      { status: result.status || 502 },
    );
  }
  return NextResponse.json({
    orderId: result.data.orderId,
    walletId: result.data.walletId,
    status: result.data.status,
    transactionId: result.data.transactionId ?? null,
  });
}
