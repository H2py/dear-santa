import { NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "viem";
import { buildWalletProofMessage } from "@/src/lib/wallet-signature";
import { inferCharacterType, type CharacterMetrics } from "@/src/lib/character-mapping";

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

const CHAINS = ["eth", "polygon", "bsc", "arbitrum", "optimism", "avax", "base"];

// 단순 추정치를 사용해 USD 환산 (거친 값이므로 리포트 용도)
const NATIVE_PRICE_USD: Record<string, number> = {
  eth: 3400,
  polygon: 0.6,
  bsc: 320,
  arbitrum: 3400, // ETH 기반
  optimism: 3400,
  avax: 45,
  base: 3400, // ETH 기반
};

const THIS_YEAR_FROM = `${new Date().getFullYear()}-01-01`;
const THIS_YEAR_TO = new Date().toISOString();
const MAX_TXS_PER_CHAIN = 5000; // 안전 장치

type MoralisTx = {
  to_address?: string | null;
  from_address?: string | null;
  value?: string | null;
  block_timestamp?: string | null;
  receipt_gas_used?: string | null;
  receipt_effective_gas_price?: string | null;
};

type MoralisHistoryResponse = {
  cursor?: string | null;
  result?: MoralisTx[];
};

type ChainAnalysis = {
  chain: string;
  txCount: number;
  protocolCount: number;
  gasEth: number;
  bestProfitUsd: number;
  worstLossUsd: number;
  monthBuckets: Map<string, number>;
  error?: string;
};

const toNativeAmount = (value?: string | null) => {
  try {
    return Number(BigInt(value ?? "0")) / 1e18;
  } catch {
    return 0;
  }
};

async function fetchHistoryForChain(chain: string, address: string) {
  let cursor: string | undefined;
  const all: MoralisTx[] = [];

  do {
    const url = new URL(`https://deep-index.moralis.io/api/v2.2/wallets/${address}/history`);
    url.searchParams.set("chain", chain);
    url.searchParams.set("from_date", THIS_YEAR_FROM);
    url.searchParams.set("to_date", THIS_YEAR_TO);
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { "X-API-Key": MORALIS_API_KEY! },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Moralis 실패 (chain=${chain}, status=${res.status})`);
    }
    const data = (await res.json()) as MoralisHistoryResponse;
    if (Array.isArray(data.result)) all.push(...data.result);
    cursor = (data.cursor ?? undefined) as string | undefined;
  } while (cursor && all.length < MAX_TXS_PER_CHAIN);

  return all.slice(0, MAX_TXS_PER_CHAIN);
}

function estimatePercentile(txCount: number, protocolCount: number) {
  const activityScore = txCount + protocolCount * 15;
  if (activityScore >= 4000) return 0.02;
  if (activityScore >= 2500) return 0.05;
  if (activityScore >= 1500) return 0.08;
  if (activityScore >= 800) return 0.12;
  if (activityScore >= 300) return 0.2;
  if (activityScore >= 120) return 0.35;
  return 0.5;
}

function analyzeChain(chain: string, address: string, txs: MoralisTx[]): ChainAnalysis {
  const contracts = new Set<string>();
  const monthBuckets = new Map<string, number>();
  let gasWei = 0n;
  let bestProfitUsd = 0;
  let worstLossUsd = 0;
  const addressLower = address.toLowerCase();
  const nativePrice = NATIVE_PRICE_USD[chain] ?? NATIVE_PRICE_USD.eth;

  for (const tx of txs) {
    if (tx.to_address) contracts.add(tx.to_address.toLowerCase());
    if (tx.receipt_gas_used && tx.receipt_effective_gas_price) {
      gasWei += BigInt(tx.receipt_gas_used) * BigInt(tx.receipt_effective_gas_price);
    }
    if (tx.block_timestamp) {
      const monthKey = tx.block_timestamp.slice(0, 7); // YYYY-MM
      monthBuckets.set(monthKey, (monthBuckets.get(monthKey) ?? 0) + 1);
    }
    if (tx.value) {
      const nativeAmount = toNativeAmount(tx.value);
      const fromMatch = tx.from_address?.toLowerCase() === addressLower;
      const toMatch = tx.to_address?.toLowerCase() === addressLower;
      // 자기 지갑 간 이동은 P&L 계산에서 제외
      if (fromMatch && toMatch) continue;
      let direction = 0;
      if (fromMatch) direction = -1;
      else if (toMatch) direction = 1;
      if (direction !== 0) {
        const usdChange = nativeAmount * nativePrice * direction;
        // 단일 트랜잭션 기준 최대 유입/유출
        if (usdChange > bestProfitUsd) bestProfitUsd = usdChange;
        if (usdChange < worstLossUsd) worstLossUsd = usdChange;
      }
    }
  }

  return {
    chain,
    txCount: txs.length,
    protocolCount: contracts.size,
    gasEth: Number(gasWei) / 1e18,
    bestProfitUsd,
    worstLossUsd,
    monthBuckets,
  };
}

function mergeMonthBuckets(buckets: Map<string, number>[]) {
  const merged = new Map<string, number>();
  for (const bucket of buckets) {
    for (const [key, count] of bucket) {
      merged.set(key, (merged.get(key) ?? 0) + count);
    }
  }
  let top: { key: string; count: number } | null = null;
  for (const [key, count] of merged) {
    if (!top || count > top.count) top = { key, count };
  }
  return top;
}

function formatMonthLabel(key?: string | null) {
  if (!key) return null;
  const [year, month] = key.split("-");
  const monthNum = Number(month);
  if (!year || Number.isNaN(monthNum)) return null;
  return `${year}년 ${monthNum}월`;
}

function derivePersonaLabel(totals: { txCount: number; protocolCount: number; gasEth: number }, bestProfitUsd: number) {
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
}

function pickSimilarity(address: string) {
  const handles = ["@defi_kim", "@airdrop_han", "@onchain_jane", "@alpha_min", "@l2_sailor"];
  const hash = [...address.toLowerCase()].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const handle = handles[hash % handles.length];
  const rawScore = 0.72 + (hash % 21) / 100; // 0.72 ~ 0.93
  return { handle, score: Math.min(0.95, Math.max(0.65, Number(rawScore.toFixed(2)))) };
}

function buildStoryLine(hottestMonth: { key: string; count: number } | null) {
  const label = formatMonthLabel(hottestMonth?.key);
  if (!label) return "올해는 아직 온체인 여정을 시작하는 단계였어요.";
  return `${label}, 당신의 온체인 인생이 가장 뜨거웠습니다.`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  if (!MORALIS_API_KEY) {
    return NextResponse.json({ error: "MORALIS_API_KEY is missing" }, { status: 500 });
  }

  const { address: rawAddress } = await params;

  if (!rawAddress || !isAddress(rawAddress)) {
    return NextResponse.json({ error: "유효한 지갑 주소가 필요합니다." }, { status: 400 });
  }

  const address = getAddress(rawAddress.toLowerCase());

  let body: { signature?: `0x${string}`; message?: string; issuedYear?: number | string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { signature, message, issuedYear } = body;
  const expectedMessage = buildWalletProofMessage(address, issuedYear);
  if (!signature || !message) {
    return NextResponse.json({ error: "서명 데이터가 필요합니다." }, { status: 400 });
  }
  if (!signature.startsWith("0x")) {
    return NextResponse.json({ error: "서명 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (message !== expectedMessage) {
    return NextResponse.json({ error: "서명 메시지가 일치하지 않습니다." }, { status: 400 });
  }
  const verified = await verifyMessage({
    address,
    signature,
    message,
  });
  if (!verified) {
    return NextResponse.json({ error: "서명이 확인되지 않았습니다." }, { status: 401 });
  }

  const perChain = await Promise.all(
    CHAINS.map(async (chain) => {
      try {
        const txs = await fetchHistoryForChain(chain, address);
        return analyzeChain(chain, address, txs);
      } catch (err: unknown) {
        return {
          chain,
          txCount: 0,
          protocolCount: 0,
          gasEth: 0,
          bestProfitUsd: 0,
          worstLossUsd: 0,
          monthBuckets: new Map<string, number>(),
          error: err instanceof Error ? err.message : "unknown error",
        };
      }
    })
  );

  const totals = {
    txCount: perChain.reduce((acc, c) => acc + c.txCount, 0),
    protocolCount: perChain.reduce((acc, c) => acc + c.protocolCount, 0),
    gasEth: perChain.reduce((acc, c) => acc + c.gasEth, 0),
  };

  const bestProfitUsd = perChain.reduce((acc, c) => Math.max(acc, c.bestProfitUsd), 0);
  const worstLossUsd = perChain.reduce((acc, c) => Math.min(acc, c.worstLossUsd), 0);
  const activityPercentile = estimatePercentile(totals.txCount, totals.protocolCount);
  const hottestMonth = mergeMonthBuckets(perChain.map((c) => c.monthBuckets));
  const personaLabel = derivePersonaLabel(totals, bestProfitUsd);
  const similarity = pickSimilarity(address);
  // Heuristic metrics for character mapping (using available data; bridge/airdrop/roundtrip are defaulted).
  const metrics: CharacterMetrics = {
    tx_per_day_30d: totals.txCount / 30,
    unique_protocols_90d: totals.protocolCount,
    unique_chains_90d: perChain.filter((c) => c.txCount > 0).length,
    bridge_txs_90d: 0,
    airdrop_like_txs_90d: 0,
    avg_hold_days_90d: 30, // not directly available; default to neutral hold to avoid overfitting.
    roundtrip_trades_24h_90d: 0,
  };
  const character = inferCharacterType(metrics);

  return NextResponse.json({
    address,
    label: personaLabel,
    character,
    chains: perChain.map((chain) => ({
      chain: chain.chain,
      txCount: chain.txCount,
      protocolCount: chain.protocolCount,
      gasEth: chain.gasEth,
      bestProfitUsd: chain.bestProfitUsd,
      worstLossUsd: chain.worstLossUsd,
      error: chain.error,
    })),
    totals,
    pnl: {
      bestProfitUsd,
      worstLossUsd,
    },
    activityPercentile,
    similarity,
    story: {
      hottestMonth: formatMonthLabel(hottestMonth?.key),
      line: buildStoryLine(hottestMonth),
    },
  });
}
