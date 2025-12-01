"use client";

import type { ReactNode } from "react";
import { VolrUIProvider } from "@volr/react-ui";
import type { VolrUIConfig } from "@volr/react-ui";
import { VolrProvider as CoreVolrProvider } from "@volr/react";

// 클라이언트 번들에서 주입: NEXT_PUBLIC_VOLR_API_KEY (필수)
const projectApiKey = process.env.NEXT_PUBLIC_VOLR_API_KEY || "missing-volr-api-key";

const volrConfig: VolrUIConfig = {
  defaultChainId: 5115,
  projectApiKey,
  appName: "Zeta zmas Tree",
  accentColor: "#3b82f6",
  enabledLoginMethods: ["email", "social", "siwe"],
  socialProviders: ["google", "twitter", "apple"],
  // Volr dev API를 사용하도록 강제 (필요 시 제거)
  // @ts-ignore
  __devApiBaseUrl: "https://dev-api.volr.io",
};

export default function VolrProvider({ children }: { children: ReactNode }) {
  return (
    <CoreVolrProvider config={volrConfig}>
      <VolrUIProvider config={volrConfig}>{children}</VolrUIProvider>
    </CoreVolrProvider>
  );
}
