import type { paths } from "@/types/schemas-auth";
import createClient from "openapi-fetch";
import { getIwmEnv } from "./env";
import {
  buildIwmRequestHeaders,
  type IwmHeaderOptions,
} from "./iwm-headers";

export function createIwmAuthClient(
  request: Request,
  headerOptions?: IwmHeaderOptions,
) {
  const { baseUrl } = getIwmEnv();

  return createClient<paths>({
    baseUrl,
    headers: buildIwmRequestHeaders(request, headerOptions),
  });
}
