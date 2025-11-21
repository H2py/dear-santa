import { randomUUID } from "node:crypto";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { decrementTicket, incrementTickets } from "@/src/lib/user";
import { getOrnamentContract } from "@/src/lib/onchain";
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

  const imageUrl = ORNAMENT_IMAGES[Math.floor(Math.random() * ORNAMENT_IMAGES.length)];
  const ornamentId = `orn-${randomUUID()}`;
  const metadata = {
    name: `Zeta Ornament ${ornamentId.slice(0, 6)}`,
    description: "Zeta Xmas Ornament",
    image: imageUrl,
    attributes: [
      { trait_type: "Type", value: "FREE_GACHA" },
      { trait_type: "OrnamentId", value: ornamentId },
      { trait_type: "OwnerSession", value: user.id },
    ],
  };
  const metadataUri = `data:application/json;utf8,${encodeURIComponent(JSON.stringify(metadata))}`;

  const contract = getOrnamentContract();
  const txHash = await contract.write.mintOrnament([
    walletAddress as Address,
    ornamentId,
    metadataUri,
  ]);

  return ok({
    ornaments: [
      {
        tempId: `tmp_${randomUUID()}`,
        type: "FREE_GACHA",
        imageUrl,
        ornamentId,
        txHash,
        metadataUri,
      },
    ],
    remainingTickets: tickets - 1,
  });
}
