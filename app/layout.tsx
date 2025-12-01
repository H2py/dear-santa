import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { christmasFont } from "./fonts";
import VolrProvider from "@/src/components/volr-provider";

import "./globals.css";

export const metadata = {
  title: "Zeta zmas Tree",
  description: "크리스마스 트리 소셜 공간",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: "Zeta zmas Tree",
    description: "친구들과 트리를 꾸미고 온체인 산타 레터를 받아보세요.",
    url: "/",
    siteName: "Zeta zmas Tree",
    images: [
      {
        url: "/home/santa-welcome.png",
        width: 512,
        height: 512,
        alt: "Zeta zmas Tree",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={christmasFont.variable}>
      <body className="bg-slate-950 text-white antialiased">
        <VolrProvider>{children}</VolrProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
