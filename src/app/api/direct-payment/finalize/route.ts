import type { DirectPaymentSession } from "@/lib/direct-payment";
import {
    finalizeDirectPayment,
    type DirectPaymentFinalizeResult,
} from "@/lib/direct-payment-kernel";
import { parsePaymentReturn } from "@/lib/payment-callback";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { NextResponse } from "next/server";

type FinalizeRequestBody = {
  session: DirectPaymentSession;
  paymentReturn?: string;
};

export async function POST(request: Request) {
  const authSession = getSessionFromRequest(request);
  if (!authSession.authorization) {
    return NextResponse.json(
      { message: "Authentification requise", errorCode: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: FinalizeRequestBody;
  try {
    body = (await request.json()) as FinalizeRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Corps JSON invalide", errorCode: "INVALID_BODY" },
      { status: 400 },
    );
  }

  if (!body.session?.orderId || !body.session.orderType) {
    return NextResponse.json(
      { message: "Session de paiement invalide", errorCode: "INVALID_SESSION" },
      { status: 400 },
    );
  }

  const paymentReturn =
    parsePaymentReturn(body.paymentReturn) ??
    parsePaymentReturn(new URL(request.url).searchParams.get("payment")) ??
    "failure";

  try {
    const result: DirectPaymentFinalizeResult = await finalizeDirectPayment(
      request,
      body.session,
      paymentReturn,
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la finalisation du paiement",
      },
      { status: 500 },
    );
  }
}
