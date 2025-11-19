import { prisma } from "@/src/lib/prisma";
import { ok } from "@/src/lib/api";

const FAKE_TREES = Array.from({ length: 10 }, (_, i) => {
  const id = `fake-${i + 1}`;
  const backgrounds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const shapes = ["classic", "pixel", "cyber"];
  return {
    id,
    background: backgrounds[i % backgrounds.length],
    shape: shapes[i % shapes.length],
    likeCount: 120 - i * 7,
    completedAt: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
    owner: { id: `user-${id}` },
  };
});

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
      likeCount: true,
      completedAt: true,
      owner: { select: { id: true } },
    },
  });

  const filled =
    trees.length >= 10
      ? trees
      : [...trees, ...FAKE_TREES.slice(0, Math.max(0, 10 - trees.length))];

  return ok({ trees: filled.slice(0, Math.min(limit, filled.length)) });
}
