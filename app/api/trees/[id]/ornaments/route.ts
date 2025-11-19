import { OrnamentType, TreeStatus } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { decrementTicket } from "@/src/lib/user";
import { inRange, requiredInt, requiredString } from "@/src/lib/validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const tree = await prisma.tree.findUnique({
    where: { id },
    include: { ornaments: true },
  });
  if (!tree) return notFound("tree not found");

  const body = await req.json();
  try {
    const slotIndex = inRange(requiredInt(body.slotIndex, "slotIndex"), 0, 9, "slotIndex");
    const type = requiredString(body.type, "type");
    const imageUrl = requiredString(body.imageUrl, "imageUrl");

    if (tree.ornaments.some((o) => o.slotIndex === slotIndex)) {
      return badRequest("slot already filled");
    }

    const ornament = await prisma.ornament.create({
      data: {
        treeId: tree.id,
        ownerId: user.id,
        slotIndex,
        type: type as OrnamentType,
        imageUrl,
      },
      select: {
        id: true,
        slotIndex: true,
        type: true,
        imageUrl: true,
      },
    });

    // mark completed if full (10 slots)
    const filled = tree.ornaments.length + 1;
    let updatedTree;
    if (filled >= 10 && tree.status !== TreeStatus.COMPLETED) {
      updatedTree = await prisma.tree.update({
        where: { id: tree.id },
        data: { status: TreeStatus.COMPLETED, completedAt: new Date() },
        select: { id: true, status: true, completedAt: true },
      });
    }

    return ok({
      ornament,
      tree: updatedTree,
    });
  } catch (err: any) {
    return badRequest(err.message ?? "invalid payload");
  }
}
