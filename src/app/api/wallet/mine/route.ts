import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session-cookies";
import { ensureMyWallet, getMyWallet } from "@/lib/wallet-kernel";

function requireAuth(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session.authorization) {
    return NextResponse.json(
      { message: "Authentification requise", errorCode: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  const result = await getMyWallet(request);
  if (!result.ok) {
    return NextResponse.json(
      { message: result.message || "Wallet indisponible", errorCode: "WALLET_ERROR" },
      { status: result.status || 502 },
    );
  }
  return NextResponse.json({ wallet: result.data });
}

export async function POST(request: Request) {
  const unauth = requireAuth(request);
  if (unauth) return unauth;
  let ownerName: string | undefined;
  try {
    const body = (await request.json()) as { ownerName?: string };
    ownerName = body?.ownerName;
  } catch {
    ownerName = undefined;
  }
  const result = await ensureMyWallet(request, ownerName);
  if (!result.ok) {
    return NextResponse.json(
      { message: result.message || "Création du wallet échouée", errorCode: "WALLET_ERROR" },
      { status: result.status || 502 },
    );
  }
  return NextResponse.json({ wallet: result.data });
}
