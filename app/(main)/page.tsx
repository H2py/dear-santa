import Link from "next/link";
import { headers } from "next/headers";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeDetail, TreeSummary } from "@/src/lib/types";

const backgroundClasses: Record<string, string> = {
  night_sky: "from-slate-900 via-indigo-900 to-cyan-900",
  snow_field: "from-slate-200 via-blue-100 to-sky-200 text-slate-900",
  aurora: "from-indigo-500 via-emerald-500 to-cyan-400",
  "1": "from-slate-900 via-indigo-900 to-cyan-900",
  "2": "from-blue-900 via-indigo-900 to-sky-500",
  "3": "from-rose-900 via-pink-800 to-red-500",
  "4": "from-slate-200 via-blue-100 to-sky-200 text-slate-900",
  "5": "from-purple-700 via-fuchsia-700 to-cyan-400",
  "6": "from-slate-800 via-blue-900 to-black",
  "7": "from-blue-700 via-sky-600 to-cyan-300",
  "8": "from-rose-600 via-pink-500 to-orange-300",
  "9": "from-emerald-900 via-slate-900 to-black",
  "10": "from-red-600 via-amber-500 to-white",
};

const shapeLabels: Record<string, string> = {
  classic: "🎄 클래식",
  pixel: "🟩 픽셀",
  cyber: "⚡️ 사이버",
};
const shapeFilters: Record<string, string> = {
  classic: "none",
  pixel: "saturate(1.4)",
  cyber: "hue-rotate(120deg) saturate(1.2)",
};

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

async function getLeaderboard(origin: string) {
  try {
    const data = await apiFetch<{ trees: TreeSummary[] }>(
      `${origin}/api/leaderboard?limit=6`,
      { cache: "no-store" }
    );
    return data.trees;
  } catch {
    return [];
  }
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
  const leaderboard = primaryTree ? [] : await getLeaderboard(origin);

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Zeta Xmas Tree</p>
        <h1 className="text-2xl font-bold">홈</h1>
      </header>

      <div className="mt-4">
        <Link
          href="/quests"
          className="block rounded-xl border border-amber-300/60 bg-amber-400/20 px-4 py-3 text-sm font-semibold text-amber-200 shadow-sm shadow-amber-500/30"
        >
          🎯 Partners Quest Board: 퀘스트 완료하고 뽑기권을 받아가세요!
        </Link>
      </div>

      {!primaryTree && (
        <section className="mt-6 space-y-3">
          <Link
            href="/tree/new"
            className="block rounded-2xl border border-emerald-300/60 bg-emerald-400/15 p-4 text-center text-sm font-semibold text-emerald-100 shadow-sm shadow-emerald-500/30"
          >
            트리 생성하기
          </Link>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            트리를 만들고 친구들과 공유해보세요. 리더보드에서 다른 트리를 구경하려면 상단의 리더보드 탭을 이용하세요.
          </div>
        </section>
      )}
    </main>
  );
}
