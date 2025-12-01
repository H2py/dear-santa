"use client";

// cspell:ignore gacha GACHA giftbox
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TreePreview } from "@/src/components/tree-preview";
import { CreateTreeModal } from "@/src/components/create-tree-modal";
import { ProfileModal } from "@/src/components/profile-modal";
import { LeaderboardModal } from "@/src/components/leaderboard-modal";
import { useVolrModal, PasskeyEnrollView, useVolr } from "@volr/react-ui";
import { encodeFunctionData } from "viem";
import type { TreeDetail } from "@/src/lib/types";
import { WalletReportCta } from "@/src/components/wallet-report-cta";

type Props = {
  primaryTree: TreeDetail | null;
};

export function HomeHero({ primaryTree }: Props) {
  const router = useRouter();
  const { open: openVolrModal, close: closeVolrModal } = useVolrModal();
  const volr = useVolr();
  const { evm, evmAddress, isLoggedIn } = volr;
  const user = (volr as any)?.user;
  const signerType = (volr as any)?.signerType;
  const keyStorageType = (volr as any)?.keyStorageType;
  const hasPasskey = (volr as any)?.hasPasskey;
  const [showGacha, setShowGacha] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showQuest, setShowQuest] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasskeyEnroll, setShowPasskeyEnroll] = useState(false);
  useEffect(() => {
    // 로그인 완료 시 Volr 기본 모달이 켜져 있다면 닫기
    if (isLoggedIn) {
      closeVolrModal?.();
    }
  }, [isLoggedIn, closeVolrModal]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<{
    tempId: string;
    imageUrl: string;
  } | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [ornaments, setOrnaments] = useState(
    () =>
      primaryTree?.ornaments ??
      ([] as { slotIndex: number; imageUrl: string; ownerId: string }[])
  );
  const [inventory, setInventory] = useState<
    { tokenId: string; imageUrl: string; balance: number }[]
  >([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 게스트 세션이 없어서 401 나는 경우가 있어 클라이언트에서 보강
  useEffect(() => {
    const ensureGuest = async () => {
      try {
        await fetch("/api/auth/guest", { method: "POST", cache: "no-store" });
      } catch {
        // ignore
      }
    };
    ensureGuest();
  }, []);
  const needsPasskey = isLoggedIn && (!!user) && (!evmAddress || signerType !== "passkey");

  // 패스키가 필요한 경우에만 모달 표시. 이미 패스키가 있으면 강제로 닫음.
  useEffect(() => {
    if (needsPasskey) {
      setShowPasskeyEnroll(true);
    } else if (showPasskeyEnroll) {
      setShowPasskeyEnroll(false);
    }
  }, [needsPasskey, showPasskeyEnroll]);

  useEffect(() => {
    setOrnaments(primaryTree?.ornaments ?? []);
  }, [primaryTree]);
  useEffect(() => {
    if (primaryTree && typeof window !== "undefined") {
      setShareLink(`${window.location.origin}/tree/${primaryTree.id}`);
    }
  }, [primaryTree]);

  const extractImage = (tokenUri?: string) => {
    if (!tokenUri) return null;
    if (tokenUri.startsWith("data:application/json")) {
      const payload = tokenUri.split(",")?.slice(1).join(",") ?? "";
      try {
        const json = tokenUri.includes(";base64,")
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
  const meFetchTsRef = useRef(0);
  const meCacheRef = useRef<unknown>(null);
  const meFetchedRef = useRef(false);

  const fetchMeOnce = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force) {
      if (meFetchedRef.current && meCacheRef.current) return meCacheRef.current;
      if (now - meFetchTsRef.current < 5000 && meCacheRef.current) return meCacheRef.current;
    }
    meFetchTsRef.current = now;
    const res = await fetch("/api/me", { cache: "no-store" });
    if (!res.ok) throw new Error("세션 정보를 불러오지 못했습니다.");
    const data = await res.json();
    meCacheRef.current = data;
    meFetchedRef.current = true;
    return data;
  }, []);

  useEffect(() => {
    fetchMeOnce().then((data) => {
      if (!data) return;
      if (data?.user?.id) setCurrentUserId(data.user.id);
      const list = (data?.ornamentNfts ?? []).map(
        (n: { tokenId: string; tokenUri: string; balance: number }) => ({
          tokenId: n.tokenId,
          imageUrl: extractImage(n.tokenUri) ?? "",
          balance: n.balance ?? 0,
        })
      );
      setInventory(
        list.filter(
          (n: { tokenId: string; imageUrl: string; balance: number }) =>
            n.imageUrl && n.balance > 0
        )
      );
    }).catch(() => {});
  }, [primaryTree, fetchMeOnce]);
  const ornamentCount = ornaments.length;
  const showStats = !!primaryTree;
  const letterCharacter = primaryTree?.character ?? null;
  const [letterPulse, setLetterPulse] = useState(false);
  const [showSantaReading, setShowSantaReading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<null | {
    user: {
      id: string;
      walletAddress?: string | null;
      gachaTickets: number;
      totalLikesUsed: number;
    };
    trees: { id: string; likeCount: number; status: string }[];
    ornaments: {
      id: string;
      slotIndex: number;
      type: string;
      imageUrl: string;
      treeId: string;
    }[];
    ornamentNfts: { tokenId: string; tokenUri: string; balance: number }[];
    nfts: { tokenId: string; tokenUri: string }[];
  }>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLikesUsed, setProfileLikesUsed] = useState<number | null>(null);
  const profileFetchTsRef = useRef(0);
  useEffect(() => {
    if (!showProfile || profileData || profileLoading) return;
    const now = Date.now();
    if (now - profileFetchTsRef.current < 5000) return; // 5초 쿨다운
    profileFetchTsRef.current = now;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError(null);
        const data = await fetchMeOnce(true);
        if (!data) throw new Error("세션 정보를 불러오지 못했습니다.");
        setProfileData(data);
        setProfileLikesUsed(data?.user?.totalLikesUsed ?? null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "로드 실패";
        setProfileError(msg);
      } finally {
        setProfileLoading(false);
      }
    };
    void loadProfile();
  }, [showProfile, profileData, profileLoading, fetchMeOnce]);
  const points = useMemo(() => {
    if (!primaryTree) return 0;
    const totalSlots = 10;
    const allOthers =
      ornaments.length >= totalSlots &&
      ornaments.every((o) => o.ownerId && o.ownerId !== primaryTree.owner.id);
    const base = allOthers ? 40 : primaryTree.status === "COMPLETED" ? 20 : 0;
    const attach = ornaments.reduce(
      (sum, o) => sum + (o.ownerId === primaryTree.owner.id ? 1 : 2),
      0
    );
    return base + attach;
  }, [ornaments, primaryTree]);

  const emptySlots = useMemo(() => {
    const filled = new Set(ornaments.map((o) => o.slotIndex));
    return Array.from({ length: 10 }, (_, i) => i).filter(
      (i) => !filled.has(i)
    );
  }, [ornaments]);

  const orderedSlots = useMemo(
    () => [...emptySlots].sort((a, b) => b - a),
    [emptySlots]
  );

  const [likeCount, setLikeCount] = useState(primaryTree?.likeCount ?? 0);
  const [liked, setLiked] = useState(primaryTree?.likedByCurrentUser ?? false);
  useEffect(() => {
    setLikeCount(primaryTree?.likeCount ?? 0);
    setLiked(primaryTree?.likedByCurrentUser ?? false);
  }, [primaryTree]);

  // 클라이언트 세션 기준으로 좋아요 상태 재동기화
  useEffect(() => {
    const refresh = async () => {
      if (!primaryTree) return;
      try {
        const res = await fetch(`/api/trees/${primaryTree.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const tree = data?.tree;
        if (tree) {
          setLikeCount(tree.likeCount ?? 0);
          setLiked(!!tree.likedByCurrentUser);
        }
      } catch {
        // ignore
      }
    };
    refresh();
  }, [primaryTree?.id]);

  // 트리 완성 시 축하 모달 1회 표시 (트리별로 로컬 저장)
  const [completeReady, setCompleteReady] = useState(false);
  const [completeShown, setCompleteShown] = useState(false);
  useEffect(() => {
    if (!primaryTree) {
      setCompleteReady(false);
      setCompleteShown(false);
      return;
    }
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem(`completeSeen:${primaryTree.id}`);
      if (seen) {
        setCompleteShown(true);
      } else {
        setCompleteShown(false);
      }
      setCompleteReady(true);
    }
  }, [primaryTree]);

  useEffect(() => {
    if (!primaryTree || !completeReady) return;
    if (emptySlots.length === 0 && !completeShown) {
      setCompleteShown(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(`completeSeen:${primaryTree.id}`, "1");
      }
    }
  }, [primaryTree, emptySlots, completeShown, completeReady]);

  // 편지 알림: 아직 열지 않았다면 1.5초 튕김을 최대 5회만 실행 (겹치지 않게 간격 둠)
  useEffect(() => {
    if (!letterCharacter || showLetter) return;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    let cancelled = false;

    const runPulse = (count: number) => {
      if (cancelled || count >= 5) return;
      setLetterPulse(true);
      timers.push(
        setTimeout(() => {
          setLetterPulse(false);
        }, 1500)
      );
      if (count < 4) {
        // 다음 펄스를 약간의 간격을 두고 예약 (조금 더 자연스럽게)
        timers.push(
          setTimeout(() => {
            runPulse(count + 1);
          }, 1700)
        );
      }
    };

    runPulse(0);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      setLetterPulse(false);
    };
  }, [letterCharacter, showLetter]);

  const initialSlot = orderedSlots[orderedSlots.length - 1] ?? null;
  const [slot, setSlot] = useState<number | null>(initialSlot);
  const slotWheelTsRef = useRef(0);
  const slotTouchStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (orderedSlots.length === 0) {
      setSlot(null);
      return;
    }
    if (slot === null || !orderedSlots.includes(slot)) {
      setSlot(orderedSlots[orderedSlots.length - 1]);
    }
  }, [orderedSlots, slot]);
  const selectedSlot = slot ?? orderedSlots[orderedSlots.length - 1] ?? null;
  const [attendance, setAttendance] = useState(() =>
    Array.from({ length: 21 }, (_, i) => ({ day: i + 1, checked: i < 2 }))
  );
  const quests = [
    {
      id: "zeta-quiz",
      title: "ZetaChain 퀴즈",
      description: "ZetaChain의 강점이 아닌 것은? (3지선다)",
      reward: "+1 뽑기권",
    },
    {
      id: "partner-l2",
      title: "Partner L2 미션",
      description: "X 계정 팔로우 + 리트윗 인증",
      reward: "+1 뽑기권",
    },
    {
      id: "logo-ornament",
      title: "오너먼트 업로드 미션",
      description: "파트너 로고 오너먼트 업로드하고 트리에 달기",
      reward: "+2 뽑기권",
    },
  ];

  const handleAttendanceCheck = () => {
    setAttendance((prev) => {
      const idx = prev.findIndex((d) => !d.checked);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], checked: true };
      return next;
    });
    setMessage("출석이 완료되었습니다!");
  };

  const ensureSlot = () => {
    if (selectedSlot === null) {
      setMessage("빈 슬롯을 선택하세요.");
      return false;
    }
    return true;
  };

  const handleDraw = async () => {
    if (!primaryTree) return;
    setMessage(null);
    setLoading(true);
    try {
      const account = evmAddress;
      const signMessage = (evm as any)?.(5115)?.signMessage;
      const walletClient = (evm as any)?.(5115);
      const sendTransaction = walletClient?.sendTransaction;
      if (!isLoggedIn || !evm || !account) {
        openVolrModal?.();
        throw new Error("로그인 후 다시 시도해주세요.");
      }
      // Volr core signer
      if (!signMessage) {
        setShowPasskeyEnroll(true);
        openVolrModal?.();
        throw new Error("패스키 지갑을 초기화하지 못했습니다. 다시 연결해 주세요.");
      }
      if (!sendTransaction) {
        setShowPasskeyEnroll(true);
        openVolrModal?.();
        throw new Error("지갑 트랜잭션 모듈을 불러오지 못했습니다. 다시 로그인해 주세요.");
      }

      const signedMessage = `Zeta Ornament Gacha (${Date.now()})`;
      const signature = await signMessage({ account, message: signedMessage });
      const res = await fetch("/api/gacha/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          signature,
          signedMessage,
          treeId: primaryTree.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "뽑기에 실패했습니다.");
      const picked = data.ornaments?.[0];
      if (!picked) throw new Error("뽑기 결과가 없습니다.");
      const permit = data?.permit;
      const permitSig = data?.signature;
      const contractAddress = data?.contractAddress;
      if (permit && permitSig && contractAddress) {
        const ORNAMENT_PERMIT_ABI = [
          {
            type: "function",
            name: "mintWithSignature",
            inputs: [
              {
                name: "permit",
                type: "tuple",
                components: [
                  { name: "to", type: "address" },
                  { name: "tokenId", type: "uint256" },
                  { name: "treeId", type: "uint256" },
                  { name: "deadline", type: "uint256" },
                  { name: "nonce", type: "uint256" },
                ],
              },
              { name: "signature", type: "bytes" },
            ],
            outputs: [],
            stateMutability: "nonpayable",
          },
        ] as const;
        const dataField = encodeFunctionData({
          abi: ORNAMENT_PERMIT_ABI,
          functionName: "mintWithSignature",
          args: [permit, permitSig],
        });
        await sendTransaction({ to: contractAddress, data: dataField });
      }
      setDrawn({
        tempId: picked.tempId ?? picked.ornamentId ?? "tmp",
        imageUrl: picked.imageUrl,
      });
      setMessage("오너먼트를 뽑았습니다! 슬롯을 선택해 달아주세요.");
      setShowGacha(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachDrawn = async () => {
    if (!primaryTree) return;
    if (!drawn) {
      setMessage("먼저 오너먼트를 뽑아주세요.");
      setShowGacha(true);
      return;
    }
    if (!ensureSlot()) return;
    setLoading(true);
    setMessage("트리에 오너먼트를 다는 중입니다...");

    // 낙관적 업데이트 준비
    const prevOrnaments = ornaments;
    const prevInventory = inventory;
    const prevDrawn = drawn;
    const optimistic = {
      slotIndex: selectedSlot,
      imageUrl: drawn.imageUrl,
      ownerId: primaryTree.owner.id,
    };

    // 즉시 UI 반영
    setOrnaments([...ornaments, optimistic]);
    setInventory((prev) => {
      const next = prev.map((n) =>
        drawn.tempId?.startsWith("inv-") && drawn.tempId.slice(4) === n.tokenId
          ? { ...n, balance: n.balance - 1 }
          : n
      );
      return next.filter((n) => n.balance > 0);
    });
    setDrawn(null);
    setShowGacha(false);

    try {
      const res = await fetch(`/api/trees/${primaryTree.id}/ornaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotIndex: selectedSlot,
          type: "FREE_GACHA",
          imageUrl: drawn.imageUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          (data as { error?: string })?.error ?? "부착에 실패했습니다."
        );
      setMessage("트리에 오너먼트를 달았습니다!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setMessage(msg);
      // 롤백
      setOrnaments(prevOrnaments);
      setInventory(prevInventory);
      setDrawn(prevDrawn);
      setShowGacha(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!primaryTree) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/trees/${primaryTree.id}/like`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        throw new Error("좋아요 처리에 실패했습니다.");
      }
      const data = await res.json().catch(() => ({}));
      if (typeof data.likeCount === "number") {
        setLikeCount(data.likeCount);
      }
      if (typeof data.likedByCurrentUser === "boolean") {
        setLiked(data.likedByCurrentUser);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      // 이미 반영된 상태라면 롤백 없이 유지
      if (
        msg.includes("already liked") ||
        msg.includes("not liked") ||
        msg.toLowerCase().includes("p2002")
      ) {
        return;
      }
      setLiked((v) => !v);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setMessage("좋아요에 실패했습니다.");
    }
  };

  return (
    <div
      className="relative min-h-[900px] overflow-hidden rounded-[32px] p-3 text-white shadow-xl"
      style={{
        backgroundImage: "url(/christmas-background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 분위기 오버레이 (밝은 강조) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-white/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.25),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(2px 2px at 15% 20%, rgba(255,255,255,0.7), transparent 50%), radial-gradient(2px 2px at 65% 35%, rgba(255,255,255,0.8), transparent 50%), radial-gradient(2px 2px at 35% 75%, rgba(255,255,255,0.7), transparent 50%), radial-gradient(2px 2px at 85% 55%, rgba(255,255,255,0.6), transparent 50%), radial-gradient(3px 3px at 50% 50%, rgba(255,255,255,0.5), transparent 60%)",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>

      {/* 상단바 */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 text-sm font-semibold text-white shadow backdrop-blur"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-white font-bold shadow">
            👤
          </span>
          <span className="text-sm font-semibold leading-tight">내 정보</span>
        </button>

        {showStats && (
          <div className="flex items-center gap-2">
            <div className="flex h-12 min-w-[128px] items-center justify-between gap-2 rounded-full bg-white/95 px-3 text-sm font-semibold text-amber-800 shadow-xl hover:-translate-y-[1px] hover:shadow-2xl transition">
              <span className="text-xs font-bold text-amber-800">포인트</span>
              <span className="text-base font-extrabold text-amber-700">
                {points}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowGacha(true)}
              className="flex h-12 min-w-[128px] items-center justify-between gap-2 rounded-full bg-white/95 px-3 text-sm text-black font-semibold shadow-xl hover:-translate-y-[1px] hover:shadow-2xl transition"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-300 text-slate-900 text-base font-bold shadow">
                🎁
              </span>
              <div className="flex flex-row items-center gap-1 leading-tight text-left">
                <span className="text-xs font-bold text-slate-900">
                  남은 횟수
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {ornamentCount}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 타이틀 */}
      <div className="relative z-10 mt-4 text-center">
        <h1 className="font-christmas text-6xl font-extrabold uppercase tracking-[0.14em] text-transparent bg-gradient-to-b from-white via-white to-purple-200 bg-clip-text drop-shadow-[0_12px_16px_rgba(120,0,160,0.35)]">
          Zmas Tree
        </h1>
      </div>

      {/* 트리가 없을 때: 타이틀과 안내 사이 산타 카드 (모바일 스케일 다운) */}
      {!primaryTree && (
        <div className="relative z-10 mx-auto mt-2 mb-2 flex max-w-3xl flex-col items-center justify-center gap-3 rounded-3xl bg-white/12 p-4 shadow-inner">
          <div className="relative aspect-[2/3] w-full max-w-[320px] overflow-hidden rounded-2xl bg-white/10 shadow-lg">
            <Image
              src={
                showSantaReading
                  ? "/home/santa-reading.png"
                  : "/home/santa-welcome.png"
              }
              alt="산타"
              fill
              className="object-contain"
              sizes="(min-width: 768px) 320px, 80vw"
            />

            {/* ⬇️ 산타 그림에 겹쳐지는 말풍선 영역 */}
            <div className="absolute inset-x-0 bottom-0">
                {!showSantaReading && (
                  <div className="mx-3 mb-3 rounded-xl bg-[#b0b1aa]/70 px-3 py-2 text-center text-sm font-semibold text-slate-900 shadow-inner whitespace-pre-line">
                  선물을 받으러 왔구나!{"\n"} 
                  트리를 만들고 잠에 들면, 올 한 해 어떤 마음으로 지냈는지 살펴보고 선물을 준비해두마.
                  </div>)
                }
              </div>
          </div>

          {/* 이 부분은 그대로 유지 */}
          <div className="w-full px-3 pt-8 text-center text-sm font-semibold text-white shadow-inner">
            {showSantaReading
              ? "산타가 착한 아이 리스트를 읽고 있어요! 선물을 받을 수 있는지 함께 확인해볼까요?"
              : "트리를 만들고 산타의 편지를 확인해보세요!"}
          </div>

          <button
            type="button"
            onClick={() => {
              if (showSantaReading) {
                setShowSantaReading(false);
              } else {
                if (!isLoggedIn || !evmAddress) {
                  openVolrModal?.();
                  return;
                }
                setShowCreateModal(true);
              }
            }}
            className="w-full rounded-full bg-emerald-300 px-5 py-4 text-base font-bold text-emerald-900 shadow transition hover:-translate-y-[1px] hover:shadow-lg active:translate-y-[1px]"
          >
            {showSantaReading ? "산타에게 말 걸기" : "트리 만들기"}
          </button>
        </div>
      )}

      {/* 메인 트리 영역 */}
      {primaryTree ? (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-4">
          <div className="relative w-full max-w-[360px]">
            {/* 트리 카드 옆 플로팅 액션 (컨테이너 안쪽, 배경 안에서 살짝 오른쪽) */}
            <div className="absolute right-[-10px] top-1/2 z-30 flex -translate-y-1/2 flex-col gap-6 sm:right-[-14px] md:right-[-218px]">
              <button
                type="button"
                onClick={() => setShowAttendance(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-emerald-700 shadow-xl shadow-black/20 transition hover:-translate-y-[2px] hover:shadow-2xl active:translate-y-[1px]"
                aria-label="출석체크"
              >
                📅
              </button>
              <button
                type="button"
                onClick={() => setShowQuest(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-purple-700 shadow-xl shadow-black/20 transition hover:-translate-y-[2px] hover:shadow-2xl active:translate-y-[1px]"
                aria-label="퀘스트"
              >
                📜
              </button>
              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-amber-600 shadow-xl shadow-black/20 transition hover:-translate-y-[2px] hover:shadow-2xl active:translate-y-[1px]"
                aria-label="리더보드"
              >
                🏆
              </button>
            </div>
            <div className="relative rounded-[32px] bg-white/18 p-4 shadow-xl shadow-purple-900/30 backdrop-blur">
              {/* 공유 시트는 카드 외부에서 토글 */}
              <TreePreview
                background={primaryTree.background}
                shape={primaryTree.shape}
                ornaments={primaryTree.ornaments.map((o) => ({
                  slotIndex: o.slotIndex,
                  imageUrl: o.imageUrl,
                }))}
                selectedSlot={selectedSlot ?? undefined}
              />
              <div className="mt-3 flex items-center gap-4 text-white">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-105 active:scale-95"
                  aria-label="좋아요"
                >
                  {liked ? (
                    <span className="text-2xl text-red-500">❤️</span>
                  ) : (
                    <span className="text-2xl text-white">🤍</span>
                  )}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowShareSheet((v) => !v)}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-105 active:scale-95"
                    aria-label="공유하기"
                  >
                    <Image
                      src="/home/share-no-bg.png"
                      alt="공유"
                      width={30}
                      height={30}
                      className="h-7 w-7 object-contain mr-8"
                    />
                  </button>
                  {showShareSheet && (
                    <div className="absolute left-1/2 top-11 z-40 w-40 -translate-x-1/2 rounded-2xl bg-slate-900/95 p-3 text-white shadow-2xl">
                      <div className="flex flex-col gap-2 text-sm">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!shareLink) return;
                            try {
                              await navigator.clipboard.writeText(shareLink);
                              setMessage("링크가 복사되었습니다.");
                            } catch {
                              setMessage("링크 복사에 실패했습니다.");
                            }
                            setShowShareSheet(false);
                          }}
                          className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-left hover:bg-white/15 transition"
                        >
                          <span className="text-lg">🔗</span>
                          <span className="text-slate-100">링크 복사</span>
                        </button>
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            "내 트리를 꾸며보세요 🎄"
                          )}&&url=${encodeURIComponent(shareLink)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/15 transition"
                          onClick={() => setShowShareSheet(false)}
                        >
                          <span className="text-lg">⤴️</span>
                          <span className="text-slate-100">공유하기</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{`좋아요 ${likeCount}개`}</p>
              <button
                type="button"
                onClick={() => setShowLetter(true)}
                className="absolute bottom-3 right-3 flex h-14 w-14 items-center justify-center rounded-full p-2 shadow-lg transition hover:-translate-y-[1px] hover:shadow-xl active:translate-y-[1px]"
                aria-label="산타 편지"
              >
                <Image
                  src="/home/santa-letter-no-bg.png"
                  alt="산타 편지 보기"
                  width={56}
                  height={56}
                  className={`h-12 w-12 object-contain ${letterPulse ? "letter-bounce" : ""}`}
                />
              </button>
            </div>
          </div>

            <div className="flex w-full max-w-[360px] flex-col items-center gap-3 rounded-[28px] bg-gradient-to-b px-3 py-5 shadow-lg backdrop-blur">
              {emptySlots.length === 0 ? (
                <div className="w-full rounded-2xl border border-amber-200/60 bg-white/85 px-4 py-4 text-center text-sm font-bold text-amber-900 shadow-inner">
                  트리가 완성되었습니다!
                </div>
              ) : (
              <div className="w-full rounded-2xl bg-white/12 p-4">
                <p className="mb-2 text-center text-sm font-semibold text-white">
                  빈 슬롯을 선택하세요
                </p>
                <div
                  className="relative w-full overflow-hidden rounded-2xl bg-white/10 py-4"
                  onWheel={(e) => {
                    e.preventDefault();
                    const now = performance.now();
                    if (now - slotWheelTsRef.current < 80) return;
                    slotWheelTsRef.current = now;
                    if (orderedSlots.length === 0) return;
                    if (Math.abs(e.deltaY) < 5) return;
                    const step = e.deltaY > 0 ? 1 : -1;
                    setSlot((prev) => {
                      const currentIndex =
                        prev !== null
                          ? orderedSlots.indexOf(prev)
                          : orderedSlots.length - 1;
                      const nextIndex = Math.min(
                        Math.max(currentIndex + step, 0),
                        orderedSlots.length - 1
                      );
                      return orderedSlots[nextIndex];
                    });
                  }}
                  onTouchStart={(e) => {
                    const y = e.touches[0]?.clientY ?? 0;
                    slotTouchStartRef.current = y;
                  }}
                  onTouchEnd={(e) => {
                    const start = slotTouchStartRef.current ?? 0;
                    const end = e.changedTouches[0]?.clientY ?? start;
                    slotTouchStartRef.current = null;
                    const delta = end - start;
                    if (Math.abs(delta) < 20 || orderedSlots.length === 0) return;
                    const step = delta > 0 ? 1 : -1;
                    setSlot((prev) => {
                      const currentIndex =
                        prev !== null
                          ? orderedSlots.indexOf(prev)
                          : orderedSlots.length - 1;
                      const nextIndex = Math.min(
                        Math.max(currentIndex + step, 0),
                        orderedSlots.length - 1
                      );
                      return orderedSlots[nextIndex];
                    });
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-white/8" />
                  <div className="pointer-events-none absolute inset-x-4 top-1/2 h-[82px] -translate-y-1/2 rounded-2xl shadow-inner" />
                <div className="relative mx-auto flex h-[170px] w-full max-w-[240px] flex-col items-center justify-center gap-2 overflow-hidden">
                  {(() => {
                    const currentIndex =
                      selectedSlot !== null
                        ? orderedSlots.indexOf(selectedSlot)
                        : orderedSlots.length - 1;
                    const safeIndex = currentIndex === -1 ? orderedSlots.length - 1 : currentIndex;
                    const viewSlots = [-1, 0, 1].map((offset) => {
                      const idx = safeIndex + offset;
                      return orderedSlots[idx] ?? null;
                    });

                    return viewSlots.map((slotValue, i) => {
                      const isActive = i === 1;
                      const exists = slotValue !== null;
                      const opacity = isActive ? 1 : exists ? 0.4 : 0.12;
                      const scale = isActive ? 1 : 0.9;
                      return (
                        <button
                          key={slotValue ?? `placeholder-${i}`}
                          type="button"
                          disabled={!exists}
                          onClick={() => exists && setSlot(slotValue)}
                          className="relative flex h-[62px] w-full items-center justify-center rounded-2xl px-6 text-lg font-extrabold text-slate-900 transition-transform"
                          style={{
                            opacity,
                            transform: `scale(${scale})`,
                            background:
                              exists && isActive
                                ? "linear-gradient(180deg,#ffe08a 0%,#f7b733 100%)"
                                : "transparent",
                            color: exists ? (isActive ? "#7a3b00" : "#1f2937") : "transparent",
                            border: exists && isActive ? "2px solid #facc15" : "1px solid transparent",
                            pointerEvents: exists ? "auto" : "none",
                          }}
                        >
                          {exists ? `슬롯 ${slotValue + 1}` : ""}
                        </button>
                      );
                    });
                    })()}
                  </div>
                </div>
              </div>
            )}
            {/* 지갑 주소 입력 (기존 컴포넌트) */}
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="mb-2 text-sm font-semibold text-white">지갑 주소 입력</p>
              <WalletReportCta />
            </div>

            {emptySlots.length === 0 && currentUserId === primaryTree?.owner.id ? (
              <button
                type="button"
                onClick={() => {
                  if (isLoggedIn) {
                    setShowCreateModal(true);
                  } else {
                    openVolrModal();
                  }
                }}
                className="w-full rounded-full bg-emerald-300 px-6 py-3 text-center text-lg font-bold text-emerald-900 shadow-[0_12px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_10px_0_rgba(0,0,0,0.16)]"
              >
                새 트리 만들기
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAttachDrawn}
                disabled={loading || !drawn}
                className="w-full rounded-full bg-amber-300 px-6 py-4 text-center text-lg font-bold text-amber-900 shadow-[0_12px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_10px_0_rgba(0,0,0,0.16)] disabled:opacity-60"
              >
                선택한 오너먼트 달기
              </button>
            )}
            {inventory.length > 0 && (
              <div className="w-full rounded-2xl p-3 text-sm text-white/90 mt-2">
                <p className="mb-2 text-center font-semibold">
                  내 오너먼트 {drawn ? "(선택됨)" : "(먼저 하나 선택하세요)"}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {inventory.map((item) => {
                    const isSelected = drawn?.tempId === `inv-${item.tokenId}`;
                    return (
                      <button
                        key={item.tokenId}
                        onClick={() =>
                          setDrawn({
                            tempId: `inv-${item.tokenId}`,
                            imageUrl: item.imageUrl,
                          })
                        }
                        className="group flex flex-col items-center gap-1 rounded-xl bg-white/12 p-3 text-white transition hover:-translate-y-0.5 hover:shadow-md"
                        style={{
                          border: isSelected ? "2px solid #facc15" : "1px solid rgba(255,255,255,0.2)",
                          boxShadow: isSelected ? "0 0 0 4px rgba(250,204,21,0.25)" : undefined,
                          transform: isSelected ? "translateY(-2px)" : undefined,
                        }}
                      >
                        <div className="h-16 w-16 overflow-hidden rounded-lg border border-white/20 bg-slate-900/60">
                          <Image
                            src={item.imageUrl}
                            alt={`ornament-${item.tokenId}`}
                            width={64}
                            height={64}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <span className="text-[11px] text-amber-200">
                          x{item.balance}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showGacha && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowGacha(false)}
        >
          <div
            className="modal-pop relative w-[92vw] max-w-xl overflow-hidden rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowGacha(false)}
              className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
            >
              닫기
            </button>
            <div className="mt-2 flex max-h-[80vh] flex-col items-center gap-4 overflow-y-auto text-slate-900">
              {!drawn ? (
                <>
                  <Image
                    src="/giftbox.png"
                    alt="gift box"
                    width={240}
                    height={240}
                    className="h-48 w-48 object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleDraw}
                    disabled={loading}
                    className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-400 px-6 py-4 text-xl font-extrabold text-amber-900 shadow-[0_14px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_12px_0_rgba(0,0,0,0.16)] disabled:opacity-60"
                  >
                    🎁 뽑기
                  </button>
                </>
              ) : (
                <div className="w-full max-w-sm text-center">
                  <p className="pb-4 text-2xl font-christmas font-bold text-amber-800">
                    🎉 축하합니다!
                  </p>
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>뽑은 오너먼트</span>
                      <span className="text-slate-400">
                        {drawn.tempId.slice(0, 6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-center">
                      <Image
                        src={drawn.imageUrl}
                        alt="drawn ornament"
                        width={220}
                        height={220}
                        className="max-h-52 rounded-xl object-contain drop-shadow-lg"
                      />
                    </div>
                    <div className="flex w-full flex-col items-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={handleDraw}
                        disabled={loading}
                        className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-[#3d5f5d] bg-gradient-to-b from-[#4f8c89] to-[#3c6d6b] px-5 py-3 text-sm font-extrabold text-[#f2e8c6] shadow-[0_8px_0_rgba(0,0,0,0.25)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_0_rgba(0,0,0,0.28)] active:translate-y-0 active:shadow-[0_8px_0_rgba(0,0,0,0.2)] disabled:opacity-60"
                      >
                        또 뽑기
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {message && (
                <p className="text-center text-xs text-slate-500">{message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateTreeModal
          onClose={() => setShowCreateModal(false)}
          onRequirePasskey={() => {
            setShowPasskeyEnroll(true);
          }}
        />
      )}

      {showProfile && (
        <ProfileModal
          open={showProfile}
          loading={profileLoading}
          error={profileError}
          profile={profileData}
          likesUsedOverride={profileLikesUsed}
          extractImage={extractImage}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* 완료 모달 제거 */}

      {showLetter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowLetter(false)}
        >
          <div
            className="modal-pop relative w-[92vw] max-w-xl overflow-hidden rounded-3xl bg-gradient-to-b from-white via-amber-50 to-rose-50 p-5 text-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowLetter(false)}
              className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
            >
              ✕
            </button>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/home/santa-letter-no-bg.png"
                  alt="산타 레터"
                  width={72}
                  height={72}
                  className="h-16 w-16 object-contain"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-500">
                    Santa&apos;s Letter
                  </p>
                  <p className="text-xl font-christmas font-bold text-amber-800">
                    온체인 투자 분석
                  </p>
                  <p className="text-xs text-slate-500">
                    트리 만들 때 서명한 지갑을 기반으로 합니다.
                  </p>
                </div>
              </div>
              {letterCharacter ? (
                <div className="space-y-2 rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-inner">
                  <p className="text-base font-extrabold text-slate-900">
                    {letterCharacter.emoji} {letterCharacter.title}
                  </p>
                  <p className="text-sm text-slate-700">{letterCharacter.description}</p>
                  <p className="text-[11px] text-amber-700">
                    이 트리는 지갑의 온체인 패턴을 산타가 해석한 결과를 담고 있어요.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-white/80 p-4 text-sm text-slate-600">
                  아직 분석 결과가 없습니다. 잠시 후 다시 시도하거나 트리를 새로 만들어 주세요.
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>※ 최신 온체인 활동을 반영하기 위해 서명 후 자동 분석됩니다.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <LeaderboardModal
          open={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showAttendance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setShowAttendance(false);
            setMessage(null);
          }}
        >
          <div
            className="modal-pop relative w-[92vw] max-w-xl overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50 via-white to-pink-50 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowAttendance(false);
                setMessage(null);
              }}
              className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
            >
              ✕
            </button>

            <div className="flex max-h-[80vh] flex-col items-center gap-4 overflow-y-auto text-slate-900">
              <div className="flex flex-col items-center">
                <Image
                  src="/home/santa-check.png"
                  alt="출석 산타"
                  width={160}
                  height={160}
                  className="h-36 w-36 object-contain"
                />
                <div className="mt-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-5 py-1 text-sm font-bold text-white shadow">
                  출석 보상
                </div>
                <p className="mt-1 text-sm font-semibold text-amber-700">
                  누적 출석 {attendance.filter((d) => d.checked).length}일
                </p>
              </div>

              <div className="w-full rounded-3xl border border-amber-200 bg-white/90 p-4 shadow-inner">
                <div className="grid grid-cols-7 gap-2">
                  {attendance.map((d) => (
                    <div
                      key={d.day}
                      className={`flex h-10 w-full items-center justify-center rounded-lg border text-sm font-bold ${
                        d.checked
                          ? "border-amber-300 bg-amber-200 text-amber-800"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {d.day}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAttendanceCheck}
                className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-400 px-6 py-3 text-lg font-bold text-amber-900 shadow-[0_12px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_10px_0_rgba(0,0,0,0.16)]"
              >
                출석하기
              </button>
              {message && <p className="text-xs text-emerald-700">{message}</p>}
            </div>
          </div>
        </div>
      )}

      {showQuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowQuest(false)}
        >
          <div
            className="modal-pop relative w-[92vw] max-w-xl overflow-hidden rounded-3xl bg-gradient-to-b from-purple-50 via-white to-indigo-50 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQuest(false)}
              className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
            >
              ✕
            </button>
            <div className="flex max-h-[80vh] flex-col items-center gap-4 overflow-y-auto text-slate-900">
              <div className="text-center space-y-1">
                <p className="text-xs uppercase font-semibold tracking-[0.2em] text-purple-500">
                  Partner Quest
                </p>
                <p className="text-2xl font-christmas font-bold text-purple-800 drop-shadow-[0_4px_8px_rgba(128,0,255,0.25)]">
                  퀘스트 보드
                </p>
                <p className="text-sm text-slate-600">
                  퀘스트를 완료하고 뽑기권을 받아보세요.
                </p>
              </div>
              <div className="w-full space-y-3">
                {quests.map((q) => (
                  <div
                    key={q.id}
                    className="space-y-2 rounded-2xl border border-purple-100 bg-white/90 p-4 shadow-inner"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {q.title}
                        </p>
                        <p className="text-sm text-slate-600">
                          {q.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        {q.reward}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-400 px-4 py-2 text-sm font-bold text-amber-900 shadow-[0_8px_0_rgba(0,0,0,0.16)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_0_rgba(0,0,0,0.18)] active:translate-y-0 active:shadow-[0_6px_0_rgba(0,0,0,0.14)]"
                      onClick={() =>
                        setMessage("퀘스트 검증/보상은 추후 연동 예정입니다.")
                      }
                    >
                      완료하기
                    </button>
                  </div>
                ))}
              </div>
              {message && <p className="text-xs text-purple-700">{message}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 패스키 등록 모달: 로그인 후 패스키가 없으면 강제 노출 */}
      <PasskeyEnrollView
        isOpen={showPasskeyEnroll && !evmAddress}
        wrapInModal
        onComplete={() => {
          setShowPasskeyEnroll(false);
          setMessage("패스키 등록이 완료되었습니다.");
        }}
        onError={(err) => {
          setMessage(err.message || "패스키 등록에 실패했습니다.");
        }}
        onClose={() => setShowPasskeyEnroll(false)}
      />
    </div>
  );
}
