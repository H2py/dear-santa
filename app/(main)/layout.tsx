import type { ReactNode } from "react";
import Link from "next/link";
import { HomeIcon, ListOrderedIcon, UserIcon } from "lucide-react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-slate-950 text-white">
      <div className="flex-1">{children}</div>
      <nav className="sticky bottom-0 z-30 grid w-full grid-cols-3 items-center gap-2 border-t border-white/10 bg-slate-900/90 px-2 py-3 text-sm backdrop-blur">
        <NavButton href="/" label="피드" icon={<HomeIcon size={18} />} />
        <NavButton href="/leaderboard" label="리더보드" icon={<ListOrderedIcon size={18} />} />
        <NavButton href="/me" label="내 활동" icon={<UserIcon size={18} />} />
      </nav>
    </div>
  );
}

function NavButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-slate-200 hover:text-white"
    >
      {icon}
      <span className="text-[11px]">{label}</span>
    </Link>
  );
}
