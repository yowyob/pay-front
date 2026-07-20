import { getSessionFromRequest } from "@/lib/session-cookies";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  return NextResponse.json({
    organizationId: session.organizationId ?? null,
    actorId: session.actorId ?? null,
    walletId: session.walletId ?? null,
  });
}
