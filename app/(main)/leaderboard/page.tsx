import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeSummary } from "@/src/lib/types";

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

async function getLeaderboard() {
  return apiFetch<{ trees: TreeSummary[] }>(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/leaderboard?limit=100`,
    { cache: "no-store" }
  );
}

function TreeCard({ tree, rank }: { tree: TreeSummary; rank: number }) {
  const bg = backgroundClasses[tree.background] ?? "from-slate-800 via-slate-900 to-black";

  return (
    <Link
      href={`/tree/${tree.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-emerald-300/60"
    >
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 font-semibold text-emerald-200">
          #{rank}
        </span>
        <span className="text-xs uppercase tracking-[0.15em] text-emerald-300">
          {tree.status === "COMPLETED" ? "완성" : "진행중"}
        </span>
      </div>
      <div className={`h-32 w-full rounded-xl bg-gradient-to-br ${bg} p-3 text-white`}>
        <div className="relative flex h-full items-center justify-center rounded-lg border border-white/15 bg-white/10">
          <Image
            src="/tree.png"
            alt="tree"
            width={80}
            height={80}
            className="h-20 w-auto drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
            priority
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span className="font-semibold text-white">#{tree.id.slice(0, 6)}</span>
        <span className="text-sm font-semibold text-amber-300">❤️ {tree.likeCount}</span>
      </div>
      <div className="text-xs text-slate-400">배경: {tree.background}</div>
      <div className="text-xs text-emerald-300 underline underline-offset-2">상세 보기</div>
    </Link>
  );
}

export default async function LeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-300">
          ← 홈
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">리더보드</span>
      </div>

      <section className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.trees.map((t, idx) => (
            <TreeCard key={t.id} tree={t} rank={idx + 1} />
          ))}
        </div>
        {data.trees.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            아직 완성된 트리가 없습니다.
          </div>
        )}
      </section>
    </main>
  );
}
