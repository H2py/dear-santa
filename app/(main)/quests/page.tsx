 "use client";

import Link from "next/link";

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

export default function QuestsPage() {
  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-300">
          ← 홈
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">
          Partners Quest Board
        </span>
      </div>

      <section className="mt-4 space-y-3">
        <p className="text-sm text-slate-300">
          파트너 퀘스트를 완료하고 뽑기권을 받아 친구 트리를 꾸며보세요.
        </p>
        <div className="space-y-3">
          {quests.map((q) => (
            <div
              key={q.id}
              className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">{q.title}</p>
                  <p className="text-sm text-slate-300">{q.description}</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {q.reward}
                </span>
              </div>
              <button
                className="w-full rounded-lg border border-emerald-300/50 bg-emerald-400/20 px-3 py-2 text-sm font-semibold text-emerald-200"
                onClick={() => alert("퀘스트 검증/보상 로직은 추후 연동 예정입니다.")}
              >
                완료하기
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
