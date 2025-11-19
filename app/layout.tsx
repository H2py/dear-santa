import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css";

export const metadata = {
  title: "Zeta Xmas Tree",
  description: "모바일 우선 크리스마스 트리 소셜 게임",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-white antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
