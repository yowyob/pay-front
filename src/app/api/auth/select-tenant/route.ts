import { readJsonBody } from "@/lib/bff-utils";
import { applySessionCookies } from "@/lib/session-cookies";
import { NextResponse } from "next/server";

type SelectTenantRequest = {
  tenantId?: string;
  contextId?: string;
};

export async function POST(request: Request) {
  const body = await readJsonBody<SelectTenantRequest>(request);
  const tenantId = body?.tenantId?.trim();

  if (!tenantId) {
    return NextResponse.json(
      { message: "tenantId requis", errorCode: "INVALID_PARAMS" },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    success: true,
    data: {
      tenantId,
      contextId: body?.contextId ?? null,
    },
  });

  applySessionCookies(response, { tenantId });
  return response;
}
