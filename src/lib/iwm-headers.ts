import type { components } from "@/types/schemas-auth";
import { getIwmEnv } from "@/lib/env";
import { getSessionFromRequest } from "@/lib/session-cookies";

type DiscoverLoginContextsResponse =
  components["schemas"]["DiscoverLoginContextsResponse"];

export type IwmHeaderOptions = {
  includeAuth?: boolean;
  includeTenant?: boolean;
};

export const IWM_PRE_AUTH_HEADERS: Required<IwmHeaderOptions> = {
  includeAuth: false,
  includeTenant: false,
};

export function buildIwmRequestHeaders(
  request: Request,
  options: IwmHeaderOptions = {},
): Record<string, string> {
  const { includeAuth = true, includeTenant = true } = options;
  const { clientId, apiKey } = getIwmEnv();
  const session = getSessionFromRequest(request);

  const headers: Record<string, string> = {
    "X-Client-Id": clientId,
    "X-Api-Key": apiKey,
  };

  if (includeTenant && session.tenantId) {
    headers["X-Tenant-Id"] = session.tenantId;
  }

  if (includeAuth && session.authorization) {
    headers.Authorization = session.authorization;
  }

  return headers;
}

export function extractTenantIdFromDiscover(
  data: DiscoverLoginContextsResponse | undefined,
): string | undefined {
  for (const context of data?.contexts ?? []) {
    if (context.tenantId?.trim()) {
      return context.tenantId.trim();
    }
  }
  return undefined;
}
