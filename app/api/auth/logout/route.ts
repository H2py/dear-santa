import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || "/";

  const res = NextResponse.redirect(new URL(redirectTo, request.url), { status: 302 });
  const toClear = ["sid", "refreshToken", "clientRefreshToken", "zeta_session"];
  toClear.forEach((name) => {
    res.cookies.set({
      name,
      value: "",
      maxAge: 0,
      path: "/",
    });
  });

  return res;
}
