import Link from "next/link";
import { headers } from "next/headers";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeDetail, TreeSummary } from "@/src/lib/types";
import { TreePreview } from "@/src/components/tree-preview";
import { TreeActions } from "@/src/components/tree-actions";
import { ShareActions } from "@/src/components/share-actions";
import { WalletReportCta } from "@/src/components/wallet-report-cta";

async function ensureSession(origin: string) {
  try {
    await fetch(`${origin}/api/auth/guest`, { method: "POST", cache: "no-store" });
  } catch {
    // ignore
  }
}

async function getMyTrees(origin: string) {
  try {
    const data = await apiFetch<{ trees: TreeSummary[] }>(`${origin}/api/trees`, {
      cache: "no-store",
    });
    return data.trees;
  } catch {
    return [];
  }
}

async function getTreeDetail(origin: string, id: string) {
  return apiFetch<{ tree: TreeDetail }>(`${origin}/api/trees/${id}`, { cache: "no-store" });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ treeId?: string }>;
}) {
  const { treeId } = await searchParams;
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? `${protocol}://${host}`;

  await ensureSession(origin);

  const myTrees = await getMyTrees(origin);
  const primaryTreeId = treeId ?? myTrees[0]?.id;
  const primaryTree = primaryTreeId ? (await getTreeDetail(origin, primaryTreeId)).tree : null;
  const shareRef = primaryTree ? primaryTree.shareCode ?? primaryTree.owner.id : null;
  const shareUrl = primaryTree
    ? `${origin}/tree/${primaryTree.id}?ref=${shareRef}&tree_id=${primaryTree.id}`
    : null;

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Zeta Xmas Tree</p>
      </header>

      <div className="mt-4">
        <Link
          href="/quests"
          className="block rounded-xl border border-amber-300/60 bg-amber-400/20 px-4 py-3 text-sm font-semibold text-amber-200 shadow-sm shadow-amber-500/30"
        >
          🎯 Partners Quest Board: 퀘스트 완료하고 뽑기권을 받아가세요!
        </Link>
      </div>

      <section
        id="letter"
        className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/25 via-cyan-500/15 to-slate-900 p-5 shadow-lg shadow-emerald-500/20">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Onchain Letter</p>
            <h1 className="text-2xl font-bold leading-tight text-white">
              산타에게 내 온체인 편지 받기
            </h1>
            <p className="text-sm text-emerald-100">
              지갑 서명 한 번으로 올해 온체인 습관을 로스트 톤으로 받아보고, 바로 트리에 걸어두세요.
            </p>
          </div>
          <Link
            href="#report"
            className="flex items-center justify-center rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-md shadow-emerald-500/30"
          >
            🧧 내 온체인 편지 받기
          </Link>
          <p className="text-xs text-emerald-100/80">
            * 온체인 데이터만 읽어옵니다. 자산 이동 없음. 서명 후 자동으로 리포트 페이지로 이동합니다.
          </p>
          <p className="text-[11px] text-emerald-100/70">
            지난 편지는 리포트 페이지에서 다시 볼 수 있어요.
          </p>
        </div>

        <div className="rounded-3xl border border-red-200/60 bg-gradient-to-br from-[#fdf7ed] via-[#f7e9dd] to-[#f0d7c9] p-4 shadow-lg shadow-red-900/15">
          <div className="space-y-3 rounded-2xl border border-red-200/70 bg-white/70 p-4 text-red-900">
            <div className="text-center text-lg font-semibold tracking-[0.16em] uppercase text-red-800">
              Dear Santa&apos;s Onchain Letter
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm text-red-700">예시 · 올해 당신의 유형</p>
              <p className="text-xl font-semibold leading-tight text-red-900">
                당신은 온체인 디파이를 기민하게 탐험하는 투자자입니다.
              </p>
              <p className="text-xs text-red-700">지갑 1개 · 0x12...beef</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-red-800 sm:grid-cols-3">
              <LetterStat label="올해 Tx" value="342건" />
              <LetterStat label="프로토콜" value="18개" />
              <LetterStat label="가스비" value="2.8 ETH" />
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-red-800 sm:grid-cols-2">
              <LetterStat label="최고의 순간" value="+$1,240" />
              <LetterStat label="아찔한 순간" value="–$620" />
            </div>
            <div className="rounded-xl border border-red-200/60 bg-white/70 px-3 py-2 text-sm font-semibold text-red-900 shadow-sm">
              2024년 5월, 당신의 온체인 인생이 가장 뜨거웠습니다.
            </div>
          </div>
        </div>
      </section>

      <section id="report" className="mt-6">
        <WalletReportCta />
      </section>

      <section id="tree-zone" className="mt-8 space-y-4">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Next Step</p>
            <h2 className="text-xl font-bold text-white">편지를 트리에 걸고, 오너먼트 주고받기</h2>
            <p className="text-sm text-slate-300">
              오늘의 무료 오너먼트를 쓰고, 친구와 트리를 채워보세요.
            </p>
          </div>
        </div>

        {primaryTree ? (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">My Tree</p>
                  <h3 className="text-xl font-bold">트리 #{primaryTree.id.slice(0, 6)}</h3>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  {primaryTree.status === "COMPLETED" ? "완성" : "진행중"}
                </span>
              </div>
              <TreePreview
                treeId={primaryTree.id}
                background={primaryTree.background}
                shape={primaryTree.shape}
                likeCount={primaryTree.likeCount}
                liked={primaryTree.likedByCurrentUser}
                ornaments={primaryTree.ornaments.map((o) => ({
                  slotIndex: o.slotIndex,
                  imageUrl: o.imageUrl,
                }))}
              />
            </section>

            <section className="space-y-3">
              <TreeActions
                treeId={primaryTree.id}
                ornaments={primaryTree.ornaments.map((o) => ({ slotIndex: o.slotIndex }))}
              />
            </section>

            <section className="space-y-3">
              {shareUrl && <ShareActions url={shareUrl} />}
            </section>
          </>
        ) : (
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Start</p>
              <h3 className="text-lg font-semibold text-white">내 트리에 편지를 걸어보세요</h3>
              <p className="text-sm text-slate-300">
                편지를 받은 뒤 트리를 만들고 친구에게 오너먼트를 부탁하세요. 출석 체크로 매일 1개씩 무료 오너먼트를 드립니다.
              </p>
            </div>
            <Link
              href="/tree/new"
              className="block rounded-xl border border-emerald-300/60 bg-emerald-400/15 px-4 py-3 text-center text-sm font-semibold text-emerald-100 shadow-sm shadow-emerald-500/30"
            >
              🎄 트리 생성하기
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}

function LetterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-red-200/60 bg-white/70 px-3 py-2 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.1em] text-red-700">{label}</p>
      <p className="text-sm font-semibold text-red-900">{value}</p>
    </div>
  );
}
