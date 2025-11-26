// cspell:ignore gacha
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeSummary, OrnamentSummary, UserLite, OrnamentBalance } from "@/src/lib/types";

type MeResponse = {
  user: UserLite;
  trees: TreeSummary[];
  ornaments: OrnamentSummary[];
  nfts: { tokenId: string; tokenUri: string }[];
  ornamentNfts: OrnamentBalance[];
};

async function getMe() {
  return apiFetch<MeResponse>("/api/me", { cache: "no-store" });
}

export default async function MePage() {
  const data = await getMe().catch(() => null);
  const needsLogin = data === null;
  const hasWallet = data?.user.walletAddress;
  const treeNfts = data?.nfts ?? [];
  const ornamentNfts = data?.ornamentNfts ?? [];

  const extractImage = (tokenUri?: string) => {
    if (!tokenUri) return null;
    if (tokenUri.startsWith("data:application/json")) {
      const payload = tokenUri.split(",")?.slice(1).join(",") ?? "";
      try {
        const json =
          tokenUri.includes(";base64,")
            ? JSON.parse(Buffer.from(payload, "base64").toString("utf8"))
            : JSON.parse(decodeURIComponent(payload));
        const image = typeof json.image === "string" ? json.image : null;
        return image;
      } catch {
        return null;
      }
    }
    return tokenUri;
  };

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-300">
          ← 홈
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">내 정보</span>
      </div>

      {needsLogin ? (
        <section className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
          <p className="text-base font-semibold text-white">세션이 없습니다</p>
          <p className="text-slate-300">게스트 세션을 만들고 다시 시도하세요.</p>
          <form action="/api/auth/guest" method="post">
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-center text-base font-semibold text-slate-900 shadow"
            >
              게스트 시작하기
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h1 className="text-lg font-semibold">세션 정보</h1>
            <p className="text-sm text-slate-300">ID: {data.user.id}</p>
            <p className="text-sm text-slate-300">가챠 티켓: {data.user.gachaTickets}</p>
            <p className="text-sm text-slate-300">사용한 좋아요: {data.user.totalLikesUsed} / 5</p>
            <p className="text-sm text-slate-300">
              지갑: {hasWallet ? data.user.walletAddress : "연결되지 않음"}
            </p>
          </section>

          <section className="mt-6 space-y-2">
            <h2 className="text-lg font-semibold">내 트리</h2>
            <div className="space-y-2">
              {data.trees.map((t) => (
                <Link
                  key={t.id}
                  href={`/tree/${t.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-white">#{t.id.slice(0, 6)}</p>
                    <p className="text-xs text-slate-400">
                      {t.status} · ❤️ {t.likeCount}
                    </p>
                  </div>
                  <span className="text-xs text-emerald-300">보기</span>
                </Link>
              ))}
              {data.trees.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  아직 트리가 없어요. 홈에서 새 트리를 만들어주세요.
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 space-y-2">
            <h2 className="text-lg font-semibold">내가 단 오너먼트</h2>
            <div className="space-y-2">
              {data.ornaments.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-slate-900/70">
                      <Image
                        src={o.imageUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <p className="text-white">슬롯 {o.slotIndex + 1}</p>
                      <p className="text-xs text-slate-400">{o.type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-300">트리 {o.treeId.slice(0, 6)}</span>
                </div>
              ))}
              {data.ornaments.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  아직 단 오너먼트가 없어요. 친구 트리에 선물해보세요!
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 space-y-2">
            <h2 className="text-lg font-semibold">내 트리 NFT</h2>
            <div className="space-y-2">
              {hasWallet && treeNfts.length > 0 ? (
                treeNfts.map((nft) => (
                  <div
                    key={nft.tokenId}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-slate-900/70">
                        {extractImage(nft.tokenUri) ? (
                          <Image
                            src={extractImage(nft.tokenUri)!}
                            alt=""
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                            no image
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold">토큰 #{nft.tokenId}</p>
                        <p className="text-xs text-slate-400">TREE NFT</p>
                      </div>
                    </div>
                    <a
                      href={`https://sepolia.etherscan.io/token/${process.env.NEXT_PUBLIC_TREE_ADDRESS}?a=${data.user.walletAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-300 underline"
                    >
                      Etherscan
                    </a>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  {hasWallet
                    ? "보유한 TREE NFT가 없습니다."
                    : "지갑이 연결된 계정이 아닙니다. 트리 생성 시 지갑 서명을 완료하면 자동 연결돼요."}
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 space-y-2">
            <h2 className="text-lg font-semibold">내 오너먼트 NFT</h2>
            <div className="space-y-2">
              {hasWallet && ornamentNfts.length > 0 ? (
                ornamentNfts.map((nft) => (
                  <div
                    key={nft.tokenId}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-slate-900/70">
                        {extractImage(nft.tokenUri) ? (
                          <Image
                            src={extractImage(nft.tokenUri)!}
                            alt=""
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                            no image
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold">오너먼트 #{nft.tokenId}</p>
                        <p className="text-xs text-slate-400">ORNAMENT NFT · x{nft.balance}</p>
                      </div>
                    </div>
                    <a
                      href={`https://sepolia.etherscan.io/token/${process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS}?a=${data.user.walletAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-300 underline"
                    >
                      Etherscan
                    </a>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  {hasWallet
                    ? "보유한 오너먼트 NFT가 없습니다."
                    : "지갑 서명을 완료하면 자동으로 지갑이 연결됩니다."}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
