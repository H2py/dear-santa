import { prisma } from "@/src/lib/prisma";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/src/lib/api";
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

  const existing = await prisma.like.findUnique({
    where: { userId_treeId: { userId: user.id, treeId: id } },
  });
  if (existing) return badRequest("already liked");

  await prisma.$transaction([
    prisma.like.create({
      data: { userId: user.id, treeId: id },
    }),
    prisma.tree.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    }),
  ]);
  const { totalLikesUsed } = await incrementLikesUsed(user.id);

  return ok({
    likeCount: tree.likeCount + 1,
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
  if (!existing) return badRequest("not liked");

  const deleted = await prisma.like.deleteMany({
    where: { userId: user.id, treeId: id },
  });
  if (deleted.count === 0) return badRequest("not liked");

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
