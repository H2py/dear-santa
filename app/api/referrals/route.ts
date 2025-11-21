import { randomUUID } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";

const shortCode = () => randomUUID().replace(/-/g, "").slice(0, 10);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    select: {
      id: true,
      code: true,
      createdAt: true,
      treeId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    inviteCode: user.inviteCode ?? null,
    referrals,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const treeId = body?.treeId as string | undefined;

  // ensure inviteCode exists for user
  if (!user.inviteCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: { inviteCode: shortCode() },
    });
  }

  const referral = await prisma.referral.create({
    data: {
      referrerId: user.id,
      code: shortCode(),
      treeId,
    },
    select: { id: true, code: true, treeId: true, createdAt: true },
  });

  return ok({ referral });
}
