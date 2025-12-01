import { prisma } from "@/src/lib/prisma";
import { forbidden, notFound, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { incrementLikesUsed, decrementLikesUsed } from "@/src/lib/user";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const tree = await prisma.tree.findUnique({ where: { id } });
  if (!tree) return notFound();

  if (user.totalLikesUsed >= 5) return forbidden("like limit reached");

  // Idempotent create: skipDuplicates to avoid P2002 on rapid taps
  const created = await prisma.like.createMany({
    data: { userId: user.id, treeId: id },
    skipDuplicates: true,
  });

  if (created.count === 0) {
    const refreshedTree = await prisma.tree.findUnique({
      where: { id },
      select: { likeCount: true },
    });
    return ok({
      likeCount: refreshedTree?.likeCount ?? tree.likeCount,
      totalLikesUsed: user.totalLikesUsed,
      likedByCurrentUser: true,
    });
  }

  await prisma.tree.update({
    where: { id },
    data: { likeCount: { increment: created.count } },
  });
  const { totalLikesUsed } = await incrementLikesUsed(user.id);
  const newLikeCount = tree.likeCount + created.count;

  return ok({
    likeCount: newLikeCount,
    totalLikesUsed,
    likedByCurrentUser: true,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const tree = await prisma.tree.findUnique({ where: { id } });
  if (!tree) return notFound();

  const existing = await prisma.like.findUnique({
    where: { userId_treeId: { userId: user.id, treeId: id } },
  });
  if (!existing) {
    const refreshed = await prisma.tree.findUnique({ where: { id }, select: { likeCount: true } });
    const refreshedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totalLikesUsed: true },
    });
    return ok({
      likeCount: refreshed?.likeCount ?? tree.likeCount,
      totalLikesUsed: refreshedUser?.totalLikesUsed ?? user.totalLikesUsed,
      likedByCurrentUser: false,
    });
  }

  const deleted = await prisma.like.deleteMany({
    where: { userId: user.id, treeId: id },
  });
  if (deleted.count === 0) {
    const refreshed = await prisma.tree.findUnique({ where: { id }, select: { likeCount: true } });
    const refreshedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totalLikesUsed: true },
    });
    return ok({
      likeCount: refreshed?.likeCount ?? tree.likeCount,
      totalLikesUsed: refreshedUser?.totalLikesUsed ?? user.totalLikesUsed,
      likedByCurrentUser: false,
    });
  }

  await prisma.tree.update({
    where: { id },
    data: { likeCount: { decrement: 1 } },
  });
  const { totalLikesUsed } = await decrementLikesUsed(user.id);

  return ok({
    likeCount: Math.max(0, tree.likeCount - 1),
    totalLikesUsed,
    likedByCurrentUser: false,
  });
}
