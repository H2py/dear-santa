"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  activityPercentile: number; // 0~1 (낮을수록 상위)
  similarity: {
    handle: string;
    score: number; // 0~1
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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(value));

const formatUsd = (value: number) => {
  const sign = value >= 0 ? "+" : "–";
  return `${sign}$${formatNumber(Math.abs(value))}`;
};

const formatPercentile = (value: number) => {
  const pct = Math.min(99.9, Math.max(0, value * 100));
  return `상위 ${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
};

const buildShareText = (report: CombinedReport) => {
  const agg = report.aggregate;
  const walletCount = report.wallets.length;
  const best = formatUsd(agg.pnl.bestProfitUsd);
  const worst = formatUsd(agg.pnl.worstLossUsd);
  return [
    `🎄 온체인 연말 리포트 (${walletCount}개 지갑 합산)`,
    `• 유형: ${agg.label}`,
    `• 올해 Tx: ${formatNumber(agg.totals.txCount)}건, 프로토콜: ${formatNumber(
      agg.totals.protocolCount
    )}개, 가스: ${agg.totals.gasEth.toFixed(2)} ETH`,
    `• P&L: 최고 ${best}, 최악 ${worst}`,
    `• 활동량: ${formatPercentile(agg.activityPercentile)}, 유사도: ${
      agg.similarity.handle
    } ${(agg.similarity.score * 100).toFixed(0)}%`,
    `• 스토리: ${agg.story.line}`,
    `#Onchain #Christmas`
  ].join("\n");
};

export default function WalletReportPage() {
  const [report, setReport] = useState<CombinedReport | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareDone, setShareDone] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(REPORT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CombinedReport | StatsResponse;
      if ((parsed as CombinedReport)?.aggregate) {
        setReport(parsed as CombinedReport);
      } else if ((parsed as StatsResponse)?.address && (parsed as StatsResponse)?.label) {
        setReport({
          aggregate: parsed as StatsResponse,
          wallets: [parsed as StatsResponse],
        });
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleShare = async (platform: "x" | "telegram") => {
    if (!report) return;
    const text = buildShareText(report);
    const url = typeof window !== "undefined" ? window.location.href : "";
    setShareError(null);
    setShareDone(null);

    if (platform === "x") {
      const intent = new URL("https://twitter.com/intent/tweet");
      intent.searchParams.set("text", text);
      if (url) intent.searchParams.set("url", url);
      window.open(intent.toString(), "_blank", "noopener,noreferrer");
      setShareDone("트위터 공유 창을 열었어요.");
      return;
    }
    if (platform === "telegram") {
      const tg = new URL("https://t.me/share/url");
      tg.searchParams.set("text", text);
      tg.searchParams.set("url", url);
      window.open(tg.toString(), "_blank", "noopener,noreferrer");
      setShareDone("텔레그램 공유 창을 열었어요.");
      return;
    }
  };

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-300">
          ← 홈으로
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">연말 리포트</span>
      </div>

      {!report ? (
        <section className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
          <p className="text-base font-semibold text-white">리포트가 없습니다</p>
          <p className="text-slate-300">
            홈에서 지갑을 입력하고 서명하면 자동으로 리포트가 생성되어 이곳에 표시됩니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-300/60 bg-emerald-400/20 px-3 py-2 text-sm font-semibold text-emerald-100"
          >
            홈으로 가기
          </Link>
        </section>
      ) : (
        <section className="mt-6 space-y-5">
          <div
            className="rounded-[28px] border border-red-200/40 p-3 shadow-lg shadow-red-900/20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg,#b91c1c 0 14px,transparent 14px 26px)",
              backgroundColor: "#f7f0e4",
            }}
          >
            <div className="rounded-[22px] border border-red-200/40 bg-[#fdf7ed] p-6 shadow-inner">
              <div className="space-y-6 rounded-[18px] border border-red-200/60 bg-[#faf3e6] px-4 py-6 text-center text-[#6b1a1a]">
                <div className="text-3xl font-semibold italic text-red-800 drop-shadow-sm">
                  Merry Christmas
                </div>
                <div className="text-lg font-semibold tracking-[0.16em] uppercase text-red-800">
                  Dear Santa&apos;s Onchain Letter
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-red-700">올해 당신의 유형</p>
                  <h1 className="text-2xl font-semibold leading-tight text-red-900">
                    {report.aggregate.label}
                  </h1>
                  <p className="text-xs text-red-700">
                    지갑 {report.wallets.length}개 · {report.aggregate.address}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm text-red-800 sm:grid-cols-3">
                  <LetterStat
                    label="올해 총 Tx"
                    value={`${formatNumber(report.aggregate.totals.txCount)}건`}
                  />
                  <LetterStat
                    label="사용한 프로토콜"
                    value={`${formatNumber(report.aggregate.totals.protocolCount)}개`}
                  />
                  <LetterStat
                    label="지불한 가스비"
                    value={`${report.aggregate.totals.gasEth.toFixed(2)} ETH`}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm text-red-800 sm:grid-cols-2">
                  <LetterStat label="최고의 순간" value={formatUsd(report.aggregate.pnl.bestProfitUsd)} />
                  <LetterStat label="아찔한 순간" value={formatUsd(report.aggregate.pnl.worstLossUsd)} />
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm text-red-800 sm:grid-cols-2">
                  <LetterStat
                    label="온체인 활동량"
                    value={formatPercentile(report.aggregate.activityPercentile)}
                  />
                  <LetterStat
                    label="나와 닮은 투자자"
                    value={`${report.aggregate.similarity.handle} ${(report.aggregate.similarity.score * 100).toFixed(0)}%`}
                  />
                </div>
                <div className="rounded-xl border border-red-200/70 bg-white/60 px-4 py-3 text-base font-semibold text-red-900 shadow-sm">
                  {report.aggregate.story.line}
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span className="text-white">소셜에 공유하기</span>
              <button
                onClick={() => handleShare("x")}
                className="rounded-md bg-black px-3 py-2 text-xs font-semibold text-white"
              >
                트위터(X)
              </button>
              <button
                onClick={() => handleShare("telegram")}
                className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-white"
              >
                텔레그램
              </button>
            </div>
            {shareError && (
              <div className="rounded-md border border-red-300/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {shareError}
              </div>
            )}
            {shareDone && (
              <div className="rounded-md border border-emerald-300/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {shareDone}
              </div>
            )}
          </section>

          {report.wallets.length > 1 && (
            <Section title="지갑별 요약" subtitle="각 지갑의 Identity Label">
              <div className="space-y-2">
                {report.wallets.map((w) => (
                  <div
                    key={w.address}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                      {w.address}
                    </p>
                    <p className="text-sm font-semibold text-white">{w.label}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </section>
      )}
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function LetterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-red-200/60 bg-white/60 px-3 py-2 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.1em] text-red-700">{label}</p>
      <p className="text-sm font-semibold text-red-900">{value}</p>
    </div>
  );
}
