import { prisma } from "@/src/lib/prisma";
import { badRequest, notFound, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
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

  const body = (await req.json().catch(() => ({}))) as unknown;
  try {
    const slotIndex = inRange(
      requiredInt(
        typeof body === "object" && body !== null ? (body as Record<string, unknown>).slotIndex : undefined,
        "slotIndex"
      ),
      0,
      9,
      "slotIndex"
    );
    const type = requiredString(
      typeof body === "object" && body !== null ? (body as Record<string, unknown>).type : undefined,
      "type"
    );
    if (type !== "FREE_GACHA" && type !== "PAID_UPLOAD") {
      return badRequest("invalid ornament type");
    }
    const imageUrl = requiredString(
      typeof body === "object" && body !== null ? (body as Record<string, unknown>).imageUrl : undefined,
      "imageUrl"
    );

    if (tree.ornaments.some((o: { slotIndex: number }) => o.slotIndex === slotIndex)) {
      return badRequest("slot already filled");
    }

    const ornament = await prisma.ornament.create({
      data: {
        treeId: tree.id,
        ownerId: user.id,
        slotIndex,
        type,
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
    if (filled >= 10 && tree.status !== "COMPLETED") {
      updatedTree = await prisma.tree.update({
        where: { id: tree.id },
        data: { status: "COMPLETED", completedAt: new Date() },
        select: { id: true, status: true, completedAt: true },
      });
    }

    return ok({
      ornament,
      tree: updatedTree,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "invalid payload";
    return badRequest(message);
  }
}
