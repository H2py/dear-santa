import { randomUUID } from "node:crypto";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { decrementTicket, incrementTickets } from "@/src/lib/user";
import { ORNAMENT_TOKEN_IDS } from "@/src/lib/constants/gameplay";
import { verifyMessage, type Address, type Hex } from "viem";

const ORNAMENT_IMAGES = Array.from({ length: 17 }, (_, i) => `/ornaments/${i + 1}.png`);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    count?: number;
    walletAddress?: Address;
    signature?: Hex;
    signedMessage?: string;
  };

  const count = typeof body.count === "number" ? body.count : 1;
  const walletAddress = body.walletAddress;
  const signature = body.signature;
  const signedMessage = body.signedMessage;

  if (count !== 1) return badRequest("only count=1 supported");
  if (!walletAddress || !signature || !signedMessage) return badRequest("wallet verification failed");

  const checks = await verifyMessage({
    address: walletAddress,
    message: signedMessage,
    signature,
  });
  if (!checks) return badRequest("signature invalid");

  if (!user.walletAddress || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { walletAddress },
    });
  }

  let tickets = user.gachaTickets;
  if (tickets <= 0) {
    // 안전장치: 티켓이 없을 때 3장 충전 후 진행
    tickets = (await incrementTickets(user.id, 3)).gachaTickets;
  }

  await decrementTicket(user.id);

  const idx = Math.floor(Math.random() * ORNAMENT_TOKEN_IDS.length);
  const tokenId = ORNAMENT_TOKEN_IDS[idx];
  const imageUrl = ORNAMENT_IMAGES[idx];
  const ornamentId = `orn-${randomUUID()}`;

  // 온체인 민트 대신 큐 적립 (옵션 B: 배치 mintBatch)
  await prisma.ornamentMintQueue.create({
    data: {
      userId: user.id,
      walletAddress,
      tokenId,
      amount: 1,
      status: "PENDING",
      ornamentId,
      imageUrl,
    },
  });

  return ok({
    ornaments: [
      {
        tempId: `tmp_${randomUUID()}`,
        type: "FREE_GACHA",
        imageUrl,
        ornamentId,
        txHash: null,
        metadataUri: null,
        tokenId,
      },
    ],
    remainingTickets: tickets - 1,
  });
}
