"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useState } from "react";

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
  background: string;
  shape?: string;
  ornaments: { slotIndex: number; imageUrl: string }[];
  selectedSlot?: number | null;
};

export function TreePreview({
  background,
  ornaments,
  selectedSlot = null,
}: Props) {
  const isDesktop = useIsDesktop();

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

  return (
    <div className="space-y-3 w-full md:max-w-md mx-auto">
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-2xl ${
          bgClass || "bg-gradient-to-br from-slate-800 via-slate-900 to-black"
        } bg-cover bg-center`}
        style={backgroundStyle}
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
        {/* 슬롯 가이드/선택 표시 */}
        {(isDesktop ? SLOT_POSITIONS_DESKTOP : SLOT_POSITIONS_MOBILE).map((pos, idx) => {
          const isSelected = selectedSlot === idx;
          if (!isSelected) return null;
          return (
            <div
              key={`slot-guide-${idx}`}
              className="absolute h-[12%] w-[12%] -translate-x-1/2 -translate-y-1/2 rounded-md border border-amber-300/90"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                boxShadow: "0 0 0 2px rgba(251,191,36,0.8)",
                background: "rgba(251,191,36,0.15)",
              }}
            />
          );
        })}
        {ornaments.map((o) => {
          const pos =
            (isDesktop ? SLOT_POSITIONS_DESKTOP : SLOT_POSITIONS_MOBILE)[o.slotIndex] ??
            (isDesktop ? SLOT_POSITIONS_DESKTOP[0] : SLOT_POSITIONS_MOBILE[0]);
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
    </div>
  );
}
