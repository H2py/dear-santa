"use client";

import type { ReactNode } from "react";
import { VolrUIProvider } from "@volr/react-ui";
import type { VolrUIConfig } from "@volr/react-ui";

// Volr 프로젝트 키: 우선순위 VOLR_API_KEY > NEXT_PUBLIC_VOLR_API_KEY
const projectApiKey =
  process.env.VOLR_API_KEY ||
  process.env.NEXT_PUBLIC_VOLR_API_KEY ||
  "missing-volr-api-key";

const volrConfig: VolrUIConfig = {
  defaultChainId: 5115,
  projectApiKey,
  appName: "Zeta zmas Tree",
  accentColor: "#3b82f6",
  enabledLoginMethods: ["email", "social", "siwe"],
  keyStorageType: "passkey",
  socialProviders: ["google", "twitter", "apple"],
  // Volr dev API를 사용하도록 강제 (필요 시 제거)
  // @ts-expect-error Volr UI config supports internal dev API override
  __devApiBaseUrl: "https://dev-api.volr.io",
};

export default function VolrProvider({ children }: { children: ReactNode }) {
  return <VolrUIProvider config={volrConfig}>{children}</VolrUIProvider>;
}
