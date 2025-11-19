import { randomUUID } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { badRequest, ok, unauthorized } from "@/src/lib/api";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const background = String(body?.background ?? "");
  const shape = body?.shape;
  if (!background || !shape) return badRequest("background and shape are required");

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

  return ok({ tree });
}

export async function GET(req: Request) {
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
