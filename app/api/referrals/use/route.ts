import { prisma } from "@/src/lib/prisma";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { requiredString } from "@/src/lib/validation";

const REFERRER_TICKET_BONUS = 1;
const REFERRED_TICKET_BONUS = 1;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await req.json();
  try {
    const code = requiredString(body.code, "code");

    if (user.referredById) return badRequest("already referred");

    const referral = await prisma.referral.findUnique({ where: { code } });
    if (!referral) return badRequest("invalid code");
    if (referral.referrerId === user.id) {
      return badRequest("cannot refer yourself");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { referredById: referral.id },
        select: { id: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { gachaTickets: { increment: REFERRED_TICKET_BONUS } },
        select: { id: true },
      }),
      prisma.user.update({
        where: { id: referral.referrerId },
        data: { gachaTickets: { increment: REFERRER_TICKET_BONUS } },
        select: { id: true },
      }),
    ]);

    return ok({
      success: true,
      referredBy: referral.id,
      referrerId: referral.referrerId,
      bonuses: {
        referred: REFERRED_TICKET_BONUS,
        referrer: REFERRER_TICKET_BONUS,
      },
    });
  } catch (err: any) {
    return badRequest(err.message ?? "invalid payload");
  }
}
