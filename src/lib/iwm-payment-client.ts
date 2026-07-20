import type { paths } from "@/types/schemas-payment";
import createClient from "openapi-fetch";
import { getIwmEnv } from "./env";
import { getSessionFromRequest } from "./session-cookies";

export function createIwmPaymentClient(request?: Request) {
  const { baseUrl, clientId, apiKey, tenantId } = getIwmEnv();
  const session = request ? getSessionFromRequest(request) : { authorization: undefined };

  return createClient<paths>({
    baseUrl,
    headers: {
      "X-Client-Id": clientId,
      "X-Api-Key": apiKey,
      "X-Tenant-Id": tenantId,
      ...(session.authorization ? { Authorization: session.authorization } : {}),
    },
  });
}
