import { PaymentStatus, PaymentType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { forbidden, notFound, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const ornament = await prisma.ornament.findUnique({
    where: { id },
    include: { tree: true },
  });
  if (!ornament) return notFound();
  if (ornament.tree.ownerId !== user.id) return forbidden("not tree owner");

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      paymentType: PaymentType.ORNAMENT_DELETE,
      amountCents: 50,
      status: PaymentStatus.SUCCESS,
      provider: "stub",
      metadata: { treeId: ornament.treeId, ornamentId: ornament.id },
    },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.ornament.delete({ where: { id: ornament.id } }),
    prisma.ornamentAudit.create({
      data: {
        ornamentId: ornament.id,
        treeId: ornament.treeId,
        actorId: user.id,
        action: "DELETED_BY_OWNER",
        paymentId: payment.id,
      },
    }),
  ]);

  return ok({ success: true });
}
