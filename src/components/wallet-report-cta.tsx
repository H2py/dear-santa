"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAddress, isAddress } from "viem";
import { buildWalletProofMessage } from "@/src/lib/wallet-signature";
import { useVolr } from "@volr/react-ui";
import { useVolrModal } from "@volr/react-ui";
import type { CharacterProfile } from "@/src/lib/types";

type ChainStat = {
  chain: string;
  txCount: number;
  protocolCount: number;
  gasEth: number;
  bestProfitUsd: number;
  worstLossUsd: number;
  error?: string;
};

type StatsResponse = {
  address: string;
  label: string;
  character?: CharacterProfile;
  chains: ChainStat[];
  totals: {
    txCount: number;
    protocolCount: number;
    gasEth: number;
  };
  pnl: {
    bestProfitUsd: number;
    worstLossUsd: number;
  };
  activityPercentile: number;
  similarity: {
    handle: string;
    score: number;
  };
  story: {
    hottestMonth: string | null;
    line: string;
  };
};

type CombinedReport = {
  aggregate: StatsResponse;
  wallets: StatsResponse[];
};

const REPORT_STORAGE_KEY = "walletReport:last";

// 서버 로직과 정합을 맞추기 위해 동일한 추정 로직 사용
const estimatePercentile = (txCount: number, protocolCount: number) => {
  const activityScore = txCount + protocolCount * 15;
  if (activityScore >= 4000) return 0.02;
  if (activityScore >= 2500) return 0.05;
  if (activityScore >= 1500) return 0.08;
  if (activityScore >= 800) return 0.12;
  if (activityScore >= 300) return 0.2;
  if (activityScore >= 120) return 0.35;
  return 0.5;
};

const derivePersonaLabel = (
  totals: { txCount: number; protocolCount: number; gasEth: number },
  bestProfitUsd: number
) => {
  if (totals.protocolCount >= 12 || totals.txCount >= 250) {
    return "당신은 올해 에어드랍 헌터 유형의 투자자입니다.";
  }
  if (totals.txCount >= 120 || totals.gasEth > 2) {
    return "당신은 온체인 디파이를 기민하게 탐험하는 투자자입니다.";
  }
  if (bestProfitUsd > 500) {
    return "당신은 기회를 놓치지 않는 스윙 트레이더입니다.";
  }
  return "당신은 작고 빠르게 실험하는 온체인 탐색자입니다.";
};

const aggregateReports = (reports: StatsResponse[]): CombinedReport => {
  if (reports.length === 0) {
    throw new Error("집계할 지갑 데이터가 없습니다.");
  }

  const totals = { txCount: 0, protocolCount: 0, gasEth: 0 };
  const chainMap = new Map<
    string,
    {
      chain: string;
      txCount: number;
      protocolCount: number;
      gasEth: number;
      bestProfitUsd: number;
      worstLossUsd: number;
      error?: string;
    }
  >();

  let bestProfitUsd = Number.NEGATIVE_INFINITY;
  let worstLossUsd = Number.POSITIVE_INFINITY;
  let hottestSource = reports[0];
  let hottestScore =
    reports[0].totals.txCount + reports[0].totals.protocolCount * 15;
  let topSimilarity = reports[0].similarity;

  for (const r of reports) {
    totals.txCount += r.totals.txCount;
    totals.protocolCount += r.totals.protocolCount;
    totals.gasEth += r.totals.gasEth;

    bestProfitUsd = Math.max(bestProfitUsd, r.pnl.bestProfitUsd);
    worstLossUsd = Math.min(worstLossUsd, r.pnl.worstLossUsd);

    if (r.similarity.score > topSimilarity.score) {
      topSimilarity = r.similarity;
    }

    const score = r.totals.txCount + r.totals.protocolCount * 15;
    if (score > hottestScore) {
      hottestSource = r;
      hottestScore = score;
    }

    for (const c of r.chains) {
      const existing = chainMap.get(c.chain);
      if (!existing) {
        chainMap.set(c.chain, { ...c });
      } else {
        existing.txCount += c.txCount;
        existing.protocolCount += c.protocolCount;
        existing.gasEth += c.gasEth;
        existing.bestProfitUsd = Math.max(existing.bestProfitUsd, c.bestProfitUsd);
        existing.worstLossUsd = Math.min(existing.worstLossUsd, c.worstLossUsd);
      }
    }
  }

  const activityPercentile = estimatePercentile(totals.txCount, totals.protocolCount);
  const label = derivePersonaLabel(totals, bestProfitUsd);

  const aggregate: StatsResponse = {
    address: reports.map((r) => r.address).join(", "),
    label,
    chains: Array.from(chainMap.values()),
    totals,
    pnl: {
      bestProfitUsd: Number.isFinite(bestProfitUsd) ? bestProfitUsd : 0,
      worstLossUsd: Number.isFinite(worstLossUsd) ? worstLossUsd : 0,
    },
    activityPercentile,
    similarity: topSimilarity,
    story: hottestSource.story,
  };

  return { aggregate, wallets: reports };
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function WalletReportCta() {
  const router = useRouter();
  const { evm, evmAddress, isLoggedIn } = useVolr();
  const { open: openVolrModal } = useVolrModal();
  const [addresses, setAddresses] = useState<string[]>(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAddrChange = (idx: number, value: string) => {
    const next = [...addresses];
    next[idx] = value;
    setAddresses(next);
  };

  const handleGo = async () => {
    const primary = addresses[0].trim();
    const optional = addresses.slice(1).map((a) => a.trim()).filter(Boolean);
    if (!primary) {
      setError("첫 번째 지갑 주소는 필수입니다.");
      return;
    }
    const targets = [primary, ...optional];
    // TODO: Solana 등 비 EVM 주소도 지원할 경우 여기서 체인별 검증/분기 추가
    if (targets.some((a) => !isAddress(a))) {
      setError("지갑 주소 형식이 올바르지 않은 항목이 있습니다.");
      return;
    }
    if (!isLoggedIn || !evm || !evmAddress) {
      openVolrModal?.();
      setError("로그인 후 다시 시도해주세요.");
      return;
    }
    const signMessage = evm(5115)?.signMessage;
    if (!signMessage) {
      setError("서명 모듈 초기화에 실패했습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const reports: StatsResponse[] = [];

      for (let i = 0; i < targets.length; i++) {
        const checksum = getAddress(targets[i]);
        setInfo(`(${i + 1}/${targets.length}) ${checksum.slice(0, 6)}… 서명 요청 중`);

        const issuedYear = new Date().getFullYear();
        const message = buildWalletProofMessage(checksum, issuedYear);
        const signature = await signMessage({ message });

        const res = await fetch(`/api/wallet/${checksum}/stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ message, signature, issuedYear }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `요청 실패 (${res.status})`);
        }
        const data = (await res.json()) as StatsResponse;
        reports.push(data);
      }

      const combined = aggregateReports(reports);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(combined));
      }
      router.push("/wallet");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
      setInfo(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {addresses.map((addr, idx) => (
          <input
            key={idx}
            value={addr}
            onChange={(e) => handleAddrChange(idx, e.target.value)}
            placeholder={`지갑 주소 ${idx + 1} ${idx === 0 ? "(필수)" : "(선택)"}`}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        ))}
      </div>

      <button
        onClick={handleGo}
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow disabled:opacity-60"
      >
        {loading ? "서명 및 수집 중..." : "전송하고 리포트 만들기"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {info}
        </div>
      )}
    </div>
  );
}
