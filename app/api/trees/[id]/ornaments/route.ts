import {
  OrnamentAuditType,
  OrnamentType,
  PaymentStatus,
  PaymentType,
  TreeStatus,
} from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { badRequest, forbidden, notFound, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { decrementTicket } from "@/src/lib/user";
import { inRange, requiredInt, requiredString } from "@/src/lib/validation";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const tree = await prisma.tree.findUnique({
    where: { id: params.id },
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

    // gacha draw는 /api/gacha/draw에서 티켓 차감 처리, 부착 시에는 추가 차감하지 않음.
    // PAID_UPLOAD는 결제 검증을 통과시키고 Payment + OrnamentAudit를 남김.

    let paymentId: string | undefined;
    if (type === OrnamentType.PAID_UPLOAD) {
      if (body.paymentId) {
        const payment = await prisma.payment.findUnique({
          where: { id: body.paymentId },
        });
        if (!payment || payment.userId !== user.id) {
          return forbidden("invalid payment");
        }
        if (
          payment.paymentType !== PaymentType.PREMIUM_UPLOAD ||
          payment.status !== PaymentStatus.SUCCESS
        ) {
          return badRequest("payment is not valid for upload");
        }
        paymentId = payment.id;
      } else {
        const payment = await prisma.payment.create({
          data: {
            userId: user.id,
            paymentType: PaymentType.PREMIUM_UPLOAD,
            amountCents: 100,
            status: PaymentStatus.SUCCESS,
            provider: "stub",
            metadata: { treeId: tree.id, slotIndex },
          },
          select: { id: true },
        });
        paymentId = payment.id;
      }
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

    await prisma.ornamentAudit.create({
      data: {
        ornamentId: ornament.id,
        treeId: tree.id,
        actorId: user.id,
        action:
          type === OrnamentType.PAID_UPLOAD
            ? OrnamentAuditType.CREATED_PAID_UPLOAD
            : OrnamentAuditType.CREATED_FREE_GACHA,
        paymentId,
        detail: { imageUrl },
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
