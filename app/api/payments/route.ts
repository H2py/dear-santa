import { PaymentStatus, PaymentType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { requiredInt, requiredString } from "@/src/lib/validation";

const DEFAULT_AMOUNTS: Record<PaymentType, number> = {
  GACHA_TICKET_PURCHASE: 50, // $0.5
  PREMIUM_UPLOAD: 100, // $1
  ORNAMENT_DELETE: 50, // $0.5
  DIRECT_TOP_UP: 0,
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await req.json();
  try {
    const type = requiredString(body.paymentType, "paymentType") as PaymentType;
    if (!Object.values(PaymentType).includes(type)) {
      return badRequest("invalid paymentType");
    }

    const amountCents =
      typeof body.amountCents === "number"
        ? requiredInt(body.amountCents, "amountCents")
        : DEFAULT_AMOUNTS[type];

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        paymentType: type,
        amountCents,
        status: PaymentStatus.SUCCESS, // stub: mark paid immediately
        provider: "stub",
        metadata: body.metadata ?? {},
      },
      select: {
        id: true,
        paymentType: true,
        amountCents: true,
        status: true,
        provider: true,
      },
    });

    return ok({ payment });
  } catch (err: any) {
    return badRequest(err.message ?? "invalid payload");
  }
}
