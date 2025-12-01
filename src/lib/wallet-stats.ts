import { getAddress, isAddress } from "viem";
import { buildWalletProofMessage } from "@/src/lib/wallet-signature";
import { inferCharacterType } from "@/src/lib/character-mapping";

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const CHAINS = ["eth", "polygon", "bsc", "arbitrum", "optimism", "avax", "base"];
const NATIVE_PRICE_USD: Record<string, number> = {
  eth: 3400,
  polygon: 0.6,
  bsc: 320,
  arbitrum: 3400,
  optimism: 3400,
  avax: 45,
  base: 3400,
};
const THIS_YEAR_FROM = `${new Date().getFullYear()}-01-01`;
const THIS_YEAR_TO = new Date().toISOString();
const MAX_TXS_PER_CHAIN = 5000;

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
      const monthKey = tx.block_timestamp.slice(0, 7);
      monthBuckets.set(monthKey, (monthBuckets.get(monthKey) ?? 0) + 1);
    }
    if (tx.value) {
      const nativeAmount = toNativeAmount(tx.value);
      const fromMatch = tx.from_address?.toLowerCase() === addressLower;
      const toMatch = tx.to_address?.toLowerCase() === addressLower;
      if (fromMatch && toMatch) continue;
      let direction = 0;
      if (fromMatch) direction = -1;
      else if (toMatch) direction = 1;
      if (direction !== 0) {
        const usdChange = nativeAmount * nativePrice * direction;
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
  const rawScore = 0.72 + (hash % 21) / 100;
  return { handle, score: Math.min(0.95, Math.max(0.65, Number(rawScore.toFixed(2)))) };
}

function buildStoryLine(hottestMonth: { key: string; count: number } | null) {
  const label = formatMonthLabel(hottestMonth?.key);
  if (!label) return "올해는 아직 온체인 여정을 시작하는 단계였어요.";
  return `${label}, 당신의 온체인 인생이 가장 뜨거웠습니다.`;
}

export async function generateWalletStats(address: string) {
  if (!MORALIS_API_KEY) {
    throw new Error("MORALIS_API_KEY is missing");
  }

  const perChain = await Promise.all(
    CHAINS.map(async (chain) => {
      try {
        const txs = await fetchHistoryForChain(chain, address);
        return analyzeChain(chain, address, txs);
      } catch (error) {
        return { chain, txCount: 0, protocolCount: 0, gasEth: 0, bestProfitUsd: 0, worstLossUsd: 0, monthBuckets: new Map(), error: error instanceof Error ? error.message : "unknown" };
      }
    })
  );

  const totals = perChain.reduce(
    (acc, cur) => ({
      txCount: acc.txCount + cur.txCount,
      protocolCount: acc.protocolCount + cur.protocolCount,
      gasEth: acc.gasEth + cur.gasEth,
    }),
    { txCount: 0, protocolCount: 0, gasEth: 0 }
  );

  const hottestMonth = mergeMonthBuckets(perChain.map((p) => p.monthBuckets));
  const personaLabel = derivePersonaLabel(totals, Math.max(...perChain.map((p) => p.bestProfitUsd)));
  const similarity = pickSimilarity(address);

  const chainsForReturn = perChain.map((p) => ({
    chain: p.chain,
    txCount: p.txCount,
    protocolCount: p.protocolCount,
    gasEth: p.gasEth,
    bestProfitUsd: p.bestProfitUsd,
    worstLossUsd: p.worstLossUsd,
    monthBuckets: Array.from(p.monthBuckets.entries()),
    error: p.error,
  }));

  const character = inferCharacterType({
    tx_per_day_30d: Math.max(1, totals.txCount / 30),
    unique_protocols_90d: totals.protocolCount,
    unique_chains_90d: perChain.filter((c) => c.txCount > 0).length,
    bridge_txs_90d: 0,
    airdrop_like_txs_90d: 0,
    avg_hold_days_90d: 0,
    roundtrip_trades_24h_90d: 0,
    // 아래 필드는 CharacterMetrics 타입에 없으므로 제외
  });

  const story = { line: buildStoryLine(hottestMonth) };

  return { totals, chains: chainsForReturn, hottestMonth, personaLabel, character, similarity, story };
}

export function verifyOwnership(address: string, signature: string) {
  const checksum = getAddress(address);
  if (!isAddress(checksum)) throw new Error("invalid address");
  const message = buildWalletProofMessage(checksum);
  return { checksum, message, signature };
}
