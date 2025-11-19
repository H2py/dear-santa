import { NextResponse } from "next/server";
import { ensureGuestUser, sanitizeUser } from "@/src/lib/auth";

export async function POST() {
  const user = await ensureGuestUser();
  return NextResponse.json({
    user: sanitizeUser(user),
  });
}
