import { randomUUID } from "node:crypto";
import { OrnamentType } from "@prisma/client";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { getCurrentUser } from "@/src/lib/auth";
import { decrementTicket, incrementTickets } from "@/src/lib/user";

const ORNAMENT_IMAGES = Array.from({ length: 17 }, (_, i) => `/ornaments/${i + 1}.png`);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const count = body?.count ?? 1;
  if (count !== 1) return badRequest("only count=1 supported");
  let tickets = user.gachaTickets;
  if (tickets <= 0) {
    // 안전장치: 티켓이 없을 때 3장 충전 후 진행
    tickets = (await incrementTickets(user.id, 3)).gachaTickets;
  }

  await decrementTicket(user.id);

  const imageUrl = ORNAMENT_IMAGES[Math.floor(Math.random() * ORNAMENT_IMAGES.length)];

  return ok({
    ornaments: [
      {
        tempId: `tmp_${randomUUID()}`,
        type: OrnamentType.FREE_GACHA,
        imageUrl,
      },
    ],
    remainingTickets: tickets - 1,
  });
}
