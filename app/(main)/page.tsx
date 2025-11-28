import Link from "next/link";
import { headers } from "next/headers";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeDetail, TreeSummary } from "@/src/lib/types";
import { TreePreview } from "@/src/components/tree-preview";
import { TreeActions } from "@/src/components/tree-actions";
import { ShareActions } from "@/src/components/share-actions";

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

      <section id="tree-zone" className="mt-6 space-y-4">
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-xl font-bold text-white">트리 꾸미고 오너먼트 주고받기</h2>
            <p className="text-sm text-slate-300">오늘의 무료 오너먼트를 쓰고, 친구와 트리를 채워보세요.</p>
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
              <h3 className="text-lg font-semibold text-white">내 트리를 만들어보세요</h3>
              <p className="text-sm text-slate-300">
                트리를 만들고 친구에게 오너먼트를 부탁하세요. 출석 체크로 매일 1개씩 무료 오너먼트를 드립니다.
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
