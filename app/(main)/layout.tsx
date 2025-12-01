import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-slate-950 text-white">
      <div className="flex-1">{children}</div>
    </div>
  );
}
