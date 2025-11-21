import { NextResponse } from "next/server";

export const ok = <T>(data: T, init?: number | ResponseInit) => {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json<T>(data, responseInit);
};

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const unauthorized = () =>
  NextResponse.json({ error: "unauthorized" }, { status: 401 });

export const forbidden = (message = "forbidden") =>
  NextResponse.json({ error: message }, { status: 403 });

export const notFound = (message = "not found") =>
  NextResponse.json({ error: message }, { status: 404 });
