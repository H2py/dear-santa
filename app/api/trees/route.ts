import { randomUUID } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { getTreeContract } from "@/src/lib/onchain";
import { verifyMessage, type Address, type Hex } from "viem";

console.log("TREE_ADDR", process.env.NEXT_PUBLIC_TREE_ADDRESS, "RPC", process.env.RPC_URL);

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

  const shareCode = randomUUID().slice(0, 10);
  const tree = await prisma.tree.create({
    data: {
      ownerId: user.id,
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
    if (!user.walletAddress || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { walletAddress },
      });
    }

    const contract = getTreeContract();
    const txHash = await contract.write.mintTree([walletAddress as Address, tree.id, metadataUri]);
    return ok({ tree, txHash, metadataUri });
  } catch (err: any) {
    return badRequest(err?.message ?? "failed to mint");
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
