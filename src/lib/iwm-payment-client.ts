import type { paths } from "@/types/schemas-payment";
import createClient from "openapi-fetch";
import { getIwmEnv } from "./env";
import {
  buildIwmRequestHeaders,
  type IwmHeaderOptions,
} from "./iwm-headers";

export function createIwmPaymentClient(
  request: Request,
  headerOptions?: IwmHeaderOptions,
) {
  const { baseUrl } = getIwmEnv();

  return createClient<paths>({
    baseUrl,
    headers: buildIwmRequestHeaders(request, headerOptions),
  });
}
