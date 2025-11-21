declare module "next/headers" {
  import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
  import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

  export function headers(): Promise<ReadonlyHeaders>;
  export function cookies(): Promise<ReadonlyRequestCookies>;
}
