"use client";

import { useState } from "react";

const backgroundClasses: Record<string, string> = {
  night_sky: "from-slate-900 via-indigo-900 to-cyan-900",
  snow_field: "from-slate-200 via-blue-100 to-sky-200 text-slate-900",
  aurora: "from-indigo-500 via-emerald-500 to-cyan-400",
  "1": "bg-[url('/bg/bg-1.png')] bg-cover bg-center",
  "2": "bg-[url('/bg/bg-2.png')] bg-cover bg-center",
  "3": "bg-[url('/bg/bg-3.png')] bg-cover bg-center",
  "4": "bg-[url('/bg/bg-4.png')] bg-cover bg-center",
  "5": "bg-[url('/bg/bg-5.png')] bg-cover bg-center",
  "6": "bg-[url('/bg/bg-6.png')] bg-cover bg-center",
  "7": "bg-[url('/bg/bg-7.png')] bg-cover bg-center",
  "8": "bg-[url('/bg/bg-8.png')] bg-cover bg-center",
  "9": "bg-[url('/bg/bg-9.png')] bg-cover bg-center",
  "10": "bg-[url('/bg/bg-10.png')] bg-cover bg-center",
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

const SLOT_POSITIONS = [
  { top: 78, left: 50 },
  { top: 68, left: 48 },
  { top: 58, left: 46 },
  { top: 50, left: 42 },
  { top: 76, left: 38 },
  { top: 68, left: 36 },
  { top: 60, left: 32 },
  { top: 55, left: 25 },
  { top: 65, left: 22 },
  { top: 75, left: 18 },
];

type Props = {
  treeId: string;
  background: string;
  shape: string;
  likeCount: number;
  liked: boolean;
  ornaments: { slotIndex: number; imageUrl: string }[];
};

export function TreePreview({
  treeId,
  background,
  shape,
  likeCount,
  liked,
  ornaments,
}: Props) {
  const [localLiked, setLocalLiked] = useState<boolean>(liked);
  const [localLikes, setLocalLikes] = useState<number>(likeCount);

  const handleLike = async () => {
    const targetLiked = !localLiked;
    setLocalLiked(targetLiked);
    setLocalLikes((c) => Math.max(0, c + (targetLiked ? 1 : -1)));

    try {
      const method = targetLiked ? "POST" : "DELETE";
      const res = await fetch(`/api/trees/${treeId}/like`, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "좋아요 처리 실패");
      }
    } catch (err: any) {
      // rollback
      const rollBackLiked = !targetLiked;
      setLocalLiked(rollBackLiked);
      setLocalLikes((c) => Math.max(0, c + (rollBackLiked ? 1 : -1)));
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-2xl ${
          backgroundClasses[background] ??
          "bg-gradient-to-br from-slate-800 via-slate-900 to-black"
        }`}
        onDoubleClick={handleLike}
      >
        <div className="absolute inset-0">
          <img
            src="/tree.png"
            alt="tree"
            className="h-full w-full object-contain drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
            style={{ filter: shapeFilters[shape] ?? "none" }}
          />
        </div>
        {ornaments.map((o) => {
          const pos = SLOT_POSITIONS[o.slotIndex] ?? SLOT_POSITIONS[0];
          return (
            <div
              key={`${o.slotIndex}-${o.imageUrl}`}
              className="absolute h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <img
                src={o.imageUrl}
                alt={`ornament-${o.slotIndex}`}
                className="h-full w-full rounded-full border border-white/40 object-cover shadow-lg shadow-black/40"
              />
            </div>
          );
        })}
        <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
          {shapeLabels[shape] ?? shape}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-amber-300">
        <span>❤️ {localLikes}</span>
      </div>
      <div className="text-[11px] text-slate-400">
        * 트리/배경을 더블 탭하면 좋아요를 추가/취소합니다.
      </div>
    </div>
  );
}
