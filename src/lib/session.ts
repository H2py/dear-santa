import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const SESSION_COOKIE = "zeta_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const createSessionToken = () => `gst_${crypto.randomUUID()}`;

export const buildSessionCookie = (value: string): Partial<ResponseCookie> => ({
  value,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
});

export const getSessionToken = async (): Promise<string | undefined> => {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
};

export const setSessionCookie = async (token: string) => {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, buildSessionCookie(token));
};
