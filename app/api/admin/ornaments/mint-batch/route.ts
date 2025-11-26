import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrnamentContract } from "@/src/lib/onchain";

const BATCH_LIMIT = 200; // 라운드당 최대 큐 항목 수
const MAX_ROUNDS = 20; // 한 요청에서 반복 처리 최대 라운드

// 간단한 보호: 서버 내부 호출용. SUPABASE_SERVICE_ROLE_KEY와 일치하는 헤더를 요구.
const authorize = (req: Request) => {
  const key = req.headers.get("x-api-key");
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key && svcKey && key === svcKey;
};

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contract = getOrnamentContract();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  let totalProcessed = 0;
  const results: { wallet: string; txHash?: string; error?: string }[] = [];
  let rounds = 0;

  while (rounds < MAX_ROUNDS) {
    rounds += 1;
    const pending = await prisma.ornamentMintQueue.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: BATCH_LIMIT,
    });
    if (pending.length === 0) break;

    const ids = pending.map((p) => p.id);

    await prisma.ornamentMintQueue.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: { status: "PROCESSING" },
    });

    const grouped = new Map<string, { tokenId: number; amount: number }[]>();
    for (const item of pending) {
      const arr = grouped.get(item.walletAddress) ?? [];
      const existing = arr.find((e) => e.tokenId === item.tokenId);
      if (existing) existing.amount += item.amount;
      else arr.push({ tokenId: item.tokenId, amount: item.amount });
      grouped.set(item.walletAddress, arr);
    }

    for (const [wallet, items] of grouped.entries()) {
      try {
        const idsArr = items.map((i) => BigInt(i.tokenId));
        const amountsArr = items.map((i) => BigInt(i.amount));
        const uris: string[] = items.map((i) => {
          const idx = i.tokenId - 100; // tokenId 101~117 → 1~17
          const imageUrl = `${origin}/ornaments/${idx}.png`;
          const metadata = {
            name: `Zeta Ornament #${i.tokenId}`,
            description: "Zeta Xmas Ornament",
            image: imageUrl,
            attributes: [{ trait_type: "tokenId", value: i.tokenId }],
          };
          return `data:application/json;utf8,${encodeURIComponent(JSON.stringify(metadata))}`;
        });

        const txHash = await contract.write.mintBatchOrnaments([
          wallet as `0x${string}`,
          idsArr,
          amountsArr,
          uris,
        ]);

        await prisma.ornamentMintQueue.updateMany({
          where: { walletAddress: wallet, status: "PROCESSING", id: { in: ids } },
          data: { status: "SENT", txHash: txHash as string, processedAt: new Date() },
        });

        results.push({ wallet, txHash: txHash as string });
      } catch (err) {
        const message = err instanceof Error ? err.message : "mint failed";
        await prisma.ornamentMintQueue.updateMany({
          where: { walletAddress: wallet, status: "PROCESSING", id: { in: ids } },
          data: { status: "FAILED", error: message },
        });
        results.push({ wallet, error: message });
      }
    }

    totalProcessed += pending.length;
    // 라운드별로 바로 다음 PENDING이 없을 수도 있으니 루프 계속
  }

  const message = totalProcessed === 0 ? "no pending items" : undefined;
  return NextResponse.json({ processed: totalProcessed, rounds, results, message });
}
