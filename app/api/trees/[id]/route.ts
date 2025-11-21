import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { notFound, ok } from "@/src/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const tree = await prisma.tree.findUnique({
    where: { id },
    select: {
      id: true,
      background: true,
      shape: true,
      status: true,
      likeCount: true,
      completedAt: true,
      ownerId: true,
      owner: { select: { id: true } },
      shareCode: true,
      ornaments: {
        select: {
          id: true,
          slotIndex: true,
          type: true,
          imageUrl: true,
          ownerId: true,
        },
        orderBy: { slotIndex: "asc" },
      },
      likes: currentUser
        ? {
            where: { userId: currentUser.id },
            select: { id: true },
          }
        : false,
    },
  });

  if (!tree) return notFound();

  const likedByCurrentUser =
    Array.isArray(tree.likes) && tree.likes.length > 0 ? true : false;

  return ok({
    tree: {
      id: tree.id,
      shareCode: tree.shareCode,
      background: tree.background,
      shape: tree.shape,
      status: tree.status,
      likeCount: tree.likeCount,
      completedAt: tree.completedAt,
      owner: { id: tree.ownerId },
      ornaments: tree.ornaments,
      likedByCurrentUser,
    },
  });
}
