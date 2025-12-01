import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { generateWalletStats } from "@/src/lib/wallet-stats";

export async function GET(_req: Request, context: unknown) {
  // context typing을 느슨하게 두고 런타임에서 안전하게 추출
  const address = (context as { params?: { address?: string } })?.params?.address;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  try {
    const checksum = getAddress(address).toLowerCase();
    const stats = await generateWalletStats(checksum);
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
