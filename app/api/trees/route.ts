import { randomUUID } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { getTreeContract } from "@/src/lib/onchain";
import { generateWalletStats } from "@/app/api/wallet/[address]/stats/route";
import { verifyMessage, type Address, type Hex } from "viem";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const background = String(body?.background ?? "");
  const shape = body?.shape;
  const walletAddress =
    typeof body?.walletAddress === "string" ? (body.walletAddress as Address) : undefined;
  const signature = typeof body?.signature === "string" ? (body.signature as Hex) : undefined;
  const signedMessage = typeof body?.signedMessage === "string" ? body.signedMessage : undefined;

  if (!background || !shape) return badRequest("background and shape are required");
  if (!walletAddress || !signature || !signedMessage) return badRequest("wallet verification failed");

  const checks = await verifyMessage({
    address: walletAddress,
    message: signedMessage,
    signature,
  });
  if (!checks) return badRequest("signature invalid");

  // Ensure wallet uniqueness: if 다른 유저가 동일 지갑을 사용 중이면 그 유저를 오너로 사용
  const existingWalletUser = await prisma.user.findFirst({
    where: { walletAddress: walletAddress },
    select: { id: true, walletAddress: true },
  });
  const ownerId = existingWalletUser ? existingWalletUser.id : user.id;

  const shareCode = randomUUID().slice(0, 10);
  const tree = await prisma.tree.create({
    data: {
      ownerId,
      background,
      shape,
      shareCode,
    },
    select: {
      id: true,
      background: true,
      shape: true,
      status: true,
      likeCount: true,
      completedAt: true,
      shareCode: true,
    },
  });

  const origin = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const metadataUri = `${origin}/api/metadata/${tree.id}`;

  try {
    if (!existingWalletUser && (!user.walletAddress || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase())) {
      await prisma.user.update({
        where: { id: user.id },
        data: { walletAddress },
      });
    }

    // 온체인 투자 성향 분석 및 CharacterReport 저장 (best-effort)
    let characterReportId: string | null = null;
    try {
      const stats = await generateWalletStats(walletAddress.toLowerCase());
      const report = await prisma.characterReport.create({
        data: {
          userId: ownerId,
          walletAddress: walletAddress.toLowerCase(),
          characterType: stats.character.type,
          emoji: stats.character.emoji,
          label: stats.character.title ?? stats.label,
          description: stats.character.description ?? stats.story?.line ?? stats.label,
          metrics: {
            totals: stats.totals,
            chains: stats.chains,
            similarity: stats.similarity,
            story: stats.story,
          },
          issuedYear: new Date().getFullYear(),
        },
        select: { id: true },
      });
      characterReportId = report.id;
      await prisma.tree.update({
        where: { id: tree.id },
        data: { characterReportId },
      });
    } catch (err) {
      console.warn("wallet stats generation failed", err);
    }

    const contract = getTreeContract();
    const txHash = await contract.write.mintTree([walletAddress as Address, tree.id, metadataUri]);
    return ok({ tree: { ...tree, characterReportId }, txHash, metadataUri });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "failed to mint";
    return badRequest(message);
  }
}

export async function GET() {
  // leader-like feed? Spec uses /api/leaderboard; keep GET /api/trees as simple list of my trees
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const trees = await prisma.tree.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      background: true,
      shape: true,
      status: true,
      likeCount: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({ trees });
}
