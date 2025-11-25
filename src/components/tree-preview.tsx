"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

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

// Precomputed slots aligned to the light bulbs on tree.png (row-major: left→right, top→bottom)
const SLOT_POSITIONS_DESKTOP = [
  { top: 26.6, left: 40.6 },
  { top: 31.5, left: 52.7 },
  { top: 30.7, left: 65.7 },
  { top: 46.9, left: 37.6 },
  { top: 52.1, left: 48.2 },
  { top: 56.3, left: 65.7 },
  { top: 71.0, left: 33.9 },
  { top: 76.7, left: 42.8 },
  { top: 80.7, left: 53.8 },
  { top: 81.7, left: 80.3 },
];


// Slightly adjusted for small screens to keep ornaments centered on the bulbs
const SLOT_POSITIONS_MOBILE = [
  { top: 27.0, left: 41.5 },
  { top: 34.0, left: 53.5 },
  { top: 31.0, left: 66.2 },
  { top: 46.0, left: 38.5 },
  { top: 52.5, left: 45.0 },
  { top: 56.5, left: 66.0 },
  { top: 71.5, left: 34.5 },
  { top: 77.0, left: 43.5 },
  { top: 81.0, left: 54.5 },
  { top: 82.0, left: 79.5 },
];

function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.matchMedia(`(min-width: ${breakpoint}px)`).matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (ev: MediaQueryListEvent) => setIsDesktop(ev.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isDesktop;
}

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
  const isDesktop = useIsDesktop();
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
    <div className="space-y-3 w-full md:max-w-[1080px] mx-auto">
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
            sizes="(max-width: 768px) 100vw, 1080px"
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
          const pos = (isDesktop ? SLOT_POSITIONS_DESKTOP : SLOT_POSITIONS_MOBILE)[o.slotIndex]
            ?? (isDesktop ? SLOT_POSITIONS_DESKTOP[0] : SLOT_POSITIONS_MOBILE[0]);
          return (
            <div
              key={`${o.slotIndex}-${o.imageUrl}`}
              className="absolute h-[12%] w-[12%] -translate-x-1/2 -translate-y-1/2"
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
