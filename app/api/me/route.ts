import { prisma } from "@/src/lib/prisma";
import { getCurrentUser, sanitizeUser } from "@/src/lib/auth";
import { ok, unauthorized } from "@/src/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [trees, ornaments] = await Promise.all([
    prisma.tree.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        status: true,
        likeCount: true,
        background: true,
        shape: true,
        completedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ornament.findMany({
      where: { ownerId: user.id },
      select: { id: true, treeId: true, slotIndex: true, type: true, imageUrl: true },
    }),
  ]);

  return ok({
    user: sanitizeUser(user),
    trees,
    ornaments,
  });
}
