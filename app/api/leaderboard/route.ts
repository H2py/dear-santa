import { prisma } from "@/src/lib/prisma";
import { ok } from "@/src/lib/api";
import { withFakeTrees } from "@/src/lib/fake-trees";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 50);
  const offset = Number(searchParams.get("offset") ?? 0);

  const trees = await prisma.tree.findMany({
    where: { status: "COMPLETED" },
    orderBy: [
      { likeCount: "desc" },
      { completedAt: "asc" },
      { createdAt: "asc" },
    ],
    take: Math.min(limit, 100),
    skip: offset,
    select: {
      id: true,
      background: true,
      shape: true,
      status: true,
      likeCount: true,
      completedAt: true,
      owner: { select: { id: true } },
    },
  });

  const filled = withFakeTrees(
    trees.map((t) => ({
      ...t,
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
    10
  );

  return ok({ trees: filled.slice(0, Math.min(limit, filled.length)) });
}
