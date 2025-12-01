"use client";

import Image from "next/image";
import { useVolr } from "@volr/react-ui";
import Link from "next/link";

type ProfileData = {
  user: { id: string; walletAddress?: string | null; gachaTickets: number; totalLikesUsed: number };
  trees: { id: string; likeCount: number; status: string }[];
  ornaments: { id: string; slotIndex: number; type: string; imageUrl: string; treeId: string }[];
  ornamentNfts: { tokenId: string; tokenUri: string; balance: number }[];
  nfts: { tokenId: string; tokenUri: string }[];
};

type Props = {
  open: boolean;
  loading: boolean;
  error: string | null;
  profile: ProfileData | null;
  likesUsedOverride: number | null;
  onClose: () => void;
  extractImage: (uri?: string) => string | null;
};

export function ProfileModal({
  open,
  loading,
  error,
  profile,
  likesUsedOverride,
  onClose,
  extractImage,
}: Props) {
  const { logout: volrLogout } = useVolr();

  const handleLogout = async () => {
    try {
      // Volr 세션 먼저 종료
      await volrLogout?.().catch(() => {});
      const redirect = typeof window !== "undefined" ? encodeURIComponent(window.location.origin || "/") : "";
      const res = await fetch(`/api/auth/logout?redirect=${redirect}`, { method: "POST" });
      if (res.ok && typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch {
      // ignore logout errors
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
      onClick={onClose}
    >
      <div
        className="relative h-[85vh] w-[95vw] max-w-5xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow hover:shadow-md transition"
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white shadow"
          >
            닫기
          </button>
        </div>
        <div className="h-full overflow-y-auto pr-2 text-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile</p>
              <h2 className="text-xl font-bold text-slate-900">내 정보</h2>
            </div>
          </div>

          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              불러오는 중...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {profile && !loading && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <h3 className="text-base font-semibold text-slate-900">세션 정보</h3>
                <div className="mt-2 space-y-1">
                  <p>ID: {profile.user.id}</p>
                  <p>가챠 티켓: {profile.user.gachaTickets}</p>
                  <p>사용한 좋아요: {(likesUsedOverride ?? profile.user.totalLikesUsed) ?? 0} / 5</p>
                  <p>지갑: {profile.user.walletAddress ?? "연결되지 않음"}</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">내 트리</h3>
                <div className="space-y-2">
                  {profile.trees.length > 0 ? (
                    profile.trees.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tree/${t.id}`}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">#{t.id.slice(0, 6)}</p>
                          <p className="text-xs text-slate-500">
                            {t.status} · ❤️ {t.likeCount}
                          </p>
                        </div>
                        <span className="text-xs text-emerald-600">보기</span>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      아직 트리가 없습니다.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">내가 단 오너먼트</h3>
                <div className="space-y-2">
                  {profile.ornaments.length > 0 ? (
                    profile.ornaments.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
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
                            <p className="text-slate-900">슬롯 {o.slotIndex + 1}</p>
                            <p className="text-xs text-slate-500">{o.type}</p>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-600">트리 {o.treeId.slice(0, 6)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      아직 단 오너먼트가 없어요.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">내 트리 NFT</h3>
                <div className="space-y-2">
                  {profile.nfts.length > 0 ? (
                    profile.nfts.map((nft) => (
                      <div
                        key={nft.tokenId}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
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
                            <p className="text-slate-900 font-semibold">토큰 #{nft.tokenId}</p>
                            <p className="text-xs text-slate-500">TREE NFT</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      보유한 TREE NFT가 없습니다.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">내 오너먼트 NFT</h3>
                <div className="space-y-2">
                  {profile.ornamentNfts.length > 0 ? (
                    profile.ornamentNfts.map((nft) => (
                      <div
                        key={nft.tokenId}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
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
                            <p className="text-slate-900 font-semibold">오너먼트 #{nft.tokenId}</p>
                            <p className="text-xs text-slate-500">x{nft.balance}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      보유한 오너먼트 NFT가 없습니다.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
