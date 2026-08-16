import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { walletTransactions } from "@/lib/wallet-kernel";

/** Historique (ledger) d'un wallet : GET ?walletId=... */
export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session.authorization) {
    return NextResponse.json(
      { message: "Authentification requise", errorCode: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  const walletId = new URL(request.url).searchParams.get("walletId");
  if (!walletId) {
    return NextResponse.json(
      { message: "walletId requis", errorCode: "INVALID_QUERY" },
      { status: 400 },
    );
  }
  const result = await walletTransactions(request, walletId);
  if (!result.ok) {
    return NextResponse.json(
      { message: result.message || "Historique indisponible", errorCode: "TX_ERROR" },
      { status: result.status || 502 },
    );
  }
  return NextResponse.json({ transactions: result.data ?? [] });
}
