import { prisma } from "@/src/lib/prisma";
import { getCurrentUser, sanitizeUser } from "@/src/lib/auth";
import { ok, unauthorized } from "@/src/lib/api";
import { fetchOwnedTokens, fetchOwnedOrnaments, fetchNftsViaMoralis } from "@/src/lib/onchain";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [trees, ornaments] = await Promise.all([
    prisma.tree.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        status: true,
        likeCount: true,
        background: true,
        shape: true,
        completedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ornament.findMany({
      where: { ownerId: user.id },
      select: { id: true, treeId: true, slotIndex: true, type: true, imageUrl: true },
    }),
  ]);

  let nfts: { tokenId: string; tokenUri: string }[] = [];
  let ornamentNfts: { tokenId: string; tokenUri: string }[] = [];
  if (user.walletAddress) {
    const owner = user.walletAddress as `0x${string}`;

    // 1) Moralis 인덱서 우선 조회
    if (process.env.MORALIS_API_KEY) {
      try {
        if (process.env.NEXT_PUBLIC_TREE_ADDRESS) {
          nfts = await fetchNftsViaMoralis({
            owner,
            contractAddress: process.env.NEXT_PUBLIC_TREE_ADDRESS,
          });
        } else {
          nfts = await fetchNftsViaMoralis({ owner });
        }
      } catch (err) {
        console.warn("Moralis tree NFT fetch failed", err);
      }
      try {
        if (process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS) {
          ornamentNfts = await fetchNftsViaMoralis({
            owner,
            contractAddress: process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS,
          });
        } else {
          ornamentNfts = await fetchNftsViaMoralis({ owner });
        }
      } catch (err) {
        console.warn("Moralis ornament NFT fetch failed", err);
      }
    }

    // 2) 온체인 직접 조회 fallback
    if (nfts.length === 0) {
      try {
        nfts = await fetchOwnedTokens(owner);
      } catch (err) {
        console.error("On-chain tree NFT fetch failed", err);
      }
    }
    if (ornamentNfts.length === 0) {
      try {
        ornamentNfts = await fetchOwnedOrnaments(owner);
      } catch (err) {
        console.error("On-chain ornament NFT fetch failed", err);
      }
    }
  }

  return ok({
    user: sanitizeUser(user),
    trees,
    ornaments,
    ornamentNfts,
    nfts,
  });
}
