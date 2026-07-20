import { getSessionFromRequest } from "@/lib/session-cookies";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  return NextResponse.json({
    authenticated: Boolean(session.authorization),
    organizationId: session.organizationId ?? null,
    actorId: session.actorId ?? null,
    walletId: session.walletId ?? null,
    tenantId: session.tenantId ?? null,
  });
}
