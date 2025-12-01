import { randomUUID } from "node:crypto";
import { badRequest, ok, unauthorized } from "@/src/lib/api";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import { decrementTicket, incrementTickets } from "@/src/lib/user";
import { ORNAMENT_TOKEN_IDS } from "@/src/lib/constants/gameplay";
import { setSessionCookie } from "@/src/lib/session";
import { verifyMessage, type Address, type Hex } from "viem";
import {
  createOrnamentMintPermit,
  getOrnamentNonce,
  isOrnamentRegistered,
} from "@/src/lib/permits";

const ORNAMENT_IMAGES = Array.from(
  { length: 17 },
  (_, i) => `/ornaments/${i + 1}.png`
);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    count?: number;
    walletAddress?: Address;
    signature?: Hex;
    signedMessage?: string;
    treeId?: string;
  };

  const count = typeof body.count === "number" ? body.count : 1;
  const walletAddress = body.walletAddress;
  const signature = body.signature;
  const signedMessage = body.signedMessage;
  const treeId = typeof body.treeId === "string" ? body.treeId : undefined;

  if (count !== 1) return badRequest("only count=1 supported");
  if (!walletAddress || !signature || !signedMessage)
    return badRequest("wallet verification failed");
  if (!treeId) return badRequest("treeId is required");

  const checks = await verifyMessage({
    address: walletAddress,
    message: signedMessage,
    signature,
  });
  if (!checks) return badRequest("signature invalid");

  // 지갑이 이미 다른 user에 매핑돼 있으면 그 계정을 재사용하고 세션을 그쪽으로 전환
  let activeUser = user;
  if (
    !user.walletAddress ||
    user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
  ) {
    const existing = await prisma.user.findFirst({
      where: { walletAddress: { equals: walletAddress, mode: "insensitive" } },
      select: {
        id: true,
        guestId: true,
        gachaTickets: true,
        totalLikesUsed: true,
        walletAddress: true,
      },
    });
    if (existing && existing.id !== user.id) {
      activeUser = existing as typeof user;
      if (existing.guestId) {
        await setSessionCookie(existing.guestId);
      }
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { walletAddress },
      });
      activeUser = {
        ...user,
        walletAddress,
      };
    }
  }

  let tickets = activeUser.gachaTickets;
  if (tickets <= 0) {
    // 안전장치: 티켓이 없을 때 3장 충전 후 진행
    tickets = (await incrementTickets(activeUser.id, 3)).gachaTickets;
  }

  await decrementTicket(activeUser.id);

  // 트리 존재/소유자 확인 + 온체인 treeId 필요
  const tree = await prisma.tree.findFirst({
    where: { id: treeId, ownerId: activeUser.id },
    select: { id: true, onchainTreeId: true },
  });
  if (!tree || !tree.onchainTreeId) {
    return badRequest("유효한 트리를 찾을 수 없습니다. 트리를 먼저 생성하세요.");
  }

  const idx = Math.floor(Math.random() * ORNAMENT_TOKEN_IDS.length);
  const tokenId = ORNAMENT_TOKEN_IDS[idx];
  const imageUrl = ORNAMENT_IMAGES[idx];
  const ornamentId = `orn-${randomUUID()}`;

  // 등록된 오너먼트만 허용
  const registered = await isOrnamentRegistered(BigInt(tokenId));
  if (!registered) {
    return badRequest("선택된 오너먼트가 등록되지 않았습니다. 관리자 등록이 필요합니다.");
  }

  // EIP-712 permit 생성 (클라이언트가 mintWithSignature 실행)
  const nonce = await getOrnamentNonce(walletAddress);
  const { permit, signature: permitSignature } = await createOrnamentMintPermit({
    to: walletAddress,
    tokenId: BigInt(tokenId),
    treeId: tree.onchainTreeId,
    nonce,
  });

  // 큐에 기록 (추적용)
  await prisma.ornamentMintQueue.create({
    data: {
      userId: activeUser.id,
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
        tokenId,
      },
    ],
    remainingTickets: tickets - 1,
    permit,
    signature: permitSignature,
    contractAddress: process.env.ORNAMENT_NFT_ADDRESS ?? process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS,
    onchainTreeId: tree.onchainTreeId.toString(),
  });
}
