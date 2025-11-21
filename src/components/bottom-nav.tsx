"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, ListOrderedIcon, UserIcon } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "피드", icon: HomeIcon },
  { href: "/leaderboard", label: "리더보드", icon: ListOrderedIcon },
  { href: "/me", label: "내 활동", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Aggressively prefetch main tabs to speed up tab switching
    NAV_ITEMS.forEach((item) => router.prefetch(item.href));
  }, [router]);

  return (
    <nav className="sticky bottom-0 z-30 grid w-full grid-cols-3 items-center gap-2 border-t border-white/10 bg-slate-900/90 px-2 py-3 text-sm backdrop-blur">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
              active ? "text-white" : "text-slate-200 hover:text-white"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} />
            <span className="text-[11px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
