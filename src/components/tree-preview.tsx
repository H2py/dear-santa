"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { type CSSProperties, useRef, useState } from "react";

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
  shape?: string;
  likeCount: number;
  liked: boolean;
  ornaments: { slotIndex: number; imageUrl: string }[];
};

export function TreePreview({
  treeId,
  background,
  likeCount,
  liked,
  ornaments,
}: Props) {
  const [localLiked, setLocalLiked] = useState<boolean>(liked);
  const [localLikes, setLocalLikes] = useState<number>(likeCount);
  const [likePending, setLikePending] = useState(false);
  const desiredLikedRef = useRef<boolean>(liked);
  const syncingRef = useRef(false);

  const bgClass = backgroundClasses[background] ?? "";
  const backgroundStyle: CSSProperties | undefined = (() => {
    if (background.startsWith("http") || background.startsWith("/")) {
      return {
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    if (/^\d+$/.test(background)) {
      return {
        backgroundImage: `url(/bg/bg-${background}.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return undefined;
  })();

  const flushLike = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setLikePending(true);
    try {
      while (true) {
        const target = desiredLikedRef.current;
        const method = target ? "POST" : "DELETE";
        const res = await fetch(`/api/trees/${treeId}/like`, { method });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = (data as { error?: string })?.error ?? "좋아요 처리 실패";
          if (message.toLowerCase().includes("already liked")) {
            desiredLikedRef.current = true;
            setLocalLiked(true);
            setLocalLikes((c) => Math.max(1, c));
          } else if (message.toLowerCase().includes("not liked")) {
            desiredLikedRef.current = false;
            setLocalLiked(false);
            setLocalLikes((c) => Math.max(0, c - 1));
          }
        }
        if (desiredLikedRef.current === target) break;
      }
    } finally {
      syncingRef.current = false;
      setLikePending(false);
    }
  };

  const handleLike = () => {
    // Optimistic toggle: update UI immediately
    const next = !desiredLikedRef.current;
    desiredLikedRef.current = next;
    setLocalLiked(next);
    setLocalLikes((c) => Math.max(0, c + (next ? 1 : -1)));
    void flushLike();
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-2xl ${
          bgClass || "bg-gradient-to-br from-slate-800 via-slate-900 to-black"
        } bg-cover bg-center`}
        style={backgroundStyle}
        onDoubleClick={handleLike}
      >
        <div className="absolute inset-0">
          <Image
            src="/tree.png"
            alt="tree"
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="h-full w-full object-contain drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
            priority
            draggable={false}
          />
        </div>
        <button
          type="button"
          onClick={handleLike}
          disabled={likePending}
          className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-2 text-sm text-white shadow-lg backdrop-blur hover:border-white/40 disabled:opacity-60"
        >
          <Heart size={18} fill={localLiked ? "currentColor" : "none"} className={localLiked ? "text-emerald-300" : "text-slate-200"} />
          <span className="text-xs font-semibold">{localLikes}</span>
        </button>
        {ornaments.map((o) => {
          const pos = SLOT_POSITIONS[o.slotIndex] ?? SLOT_POSITIONS[0];
          return (
            <div
              key={`${o.slotIndex}-${o.imageUrl}`}
              className="relative absolute h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            >
              <Image
                src={o.imageUrl}
                alt={`ornament-${o.slotIndex}`}
                fill
                sizes="72px"
                className="rounded-full border border-white/40 object-cover shadow-lg shadow-black/40"
                unoptimized
                draggable={false}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-sm text-amber-300">
        <span className="text-slate-200">더블탭 또는 하트를 눌러 좋아요를 추가/취소할 수 있어요.</span>
      </div>
    </div>
  );
}
