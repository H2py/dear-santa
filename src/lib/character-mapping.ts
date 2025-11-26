import type { CharacterProfile, CharacterType } from "@/src/lib/constants/gameplay";

// Metrics definition aligned with the agreed spec (recent 90d/30d windows ideally).
export type CharacterMetrics = {
  tx_per_day_30d: number;
  unique_protocols_90d: number;
  unique_chains_90d: number;
  bridge_txs_90d: number;
  airdrop_like_txs_90d: number;
  avg_hold_days_90d: number;
  roundtrip_trades_24h_90d: number;
};

type Scored = { type: CharacterType; score: number };

const profiles: Record<CharacterType, Omit<CharacterProfile, "type">> = {
  DEGEN: {
    emoji: "😈",
    title: "디젠형",
    description: "멈추지 않는 손가락. 시장과 함께 롤러코스터 타는 타입.",
  },
  FARMER: {
    emoji: "🐿️",
    title: "에어드랍 농사형",
    description: "퀘스트·포인트·에어드랍이면 일단 다 해보는 타입.",
  },
  NOMAD: {
    emoji: "🧭",
    title: "유목민형",
    description: "여기저기 떠돌며 기회를 찾는 온체인 여행자.",
  },
  LOOPER: {
    emoji: "🔁",
    title: "루프/단타형",
    description: "들어갔다가 후회하고, 나왔다가 또 들어가는 단타 루프형.",
  },
  SNIPER: {
    emoji: "🧊",
    title: "스나이퍼형",
    description: "움직임은 적지만, 들어갈 땐 정확하게 쏘는 타입.",
  },
  HODLER: {
    emoji: "🪨",
    title: "HODL러",
    description: "아무것도 안 했지만 버텼고, 그게 곧 승리인 타입.",
  },
};

// Priority-based mapping; first match wins. If no match, fall back to best score.
const classifiers: Array<(m: CharacterMetrics) => CharacterType | null> = [
  (m) => {
    const primary = m.tx_per_day_30d >= 10 && m.unique_protocols_90d >= 10;
    const secondary = m.tx_per_day_30d >= 5 && m.roundtrip_trades_24h_90d >= 15;
    return primary || secondary ? "DEGEN" : null;
  },
  (m) => {
    const cond = m.airdrop_like_txs_90d >= 20 && m.tx_per_day_30d >= 2 && m.tx_per_day_30d <= 10;
    const protocolBoost = m.unique_protocols_90d >= 8;
    return cond || protocolBoost ? "FARMER" : null;
  },
  (m) => {
    const cond = m.unique_chains_90d >= 4 && m.bridge_txs_90d >= 4;
    const boost = m.unique_protocols_90d >= 6;
    return cond || boost ? "NOMAD" : null;
  },
  (m) => {
    const cond =
      m.tx_per_day_30d >= 3 &&
      m.tx_per_day_30d <= 10 &&
      m.roundtrip_trades_24h_90d >= 10 &&
      m.avg_hold_days_90d < 3;
    return cond ? "LOOPER" : null;
  },
  (m) => {
    const cond =
      m.tx_per_day_30d >= 0.3 &&
      m.tx_per_day_30d <= 3 &&
      m.unique_protocols_90d <= 5 &&
      m.avg_hold_days_90d >= 3 &&
      m.avg_hold_days_90d <= 20;
    return cond ? "SNIPER" : null;
  },
  (m) => {
    const cond = m.tx_per_day_30d < 0.5 && m.avg_hold_days_90d >= 30;
    return cond ? "HODLER" : null;
  },
];

const fallbackScores = (m: CharacterMetrics): Scored[] => {
  return [
    {
      type: "DEGEN",
      score:
        Number(m.tx_per_day_30d >= 5) +
        Number(m.tx_per_day_30d >= 10) +
        Number(m.unique_protocols_90d >= 8) +
        Number(m.roundtrip_trades_24h_90d >= 10),
    },
    {
      type: "FARMER",
      score:
        Number(m.airdrop_like_txs_90d >= 10) +
        Number(m.airdrop_like_txs_90d >= 20) +
        Number(m.unique_protocols_90d >= 6) +
        Number(m.tx_per_day_30d >= 2 && m.tx_per_day_30d <= 10),
    },
    {
      type: "NOMAD",
      score:
        Number(m.unique_chains_90d >= 3) +
        Number(m.unique_chains_90d >= 4) +
        Number(m.bridge_txs_90d >= 2) +
        Number(m.bridge_txs_90d >= 4),
    },
    {
      type: "LOOPER",
      score:
        Number(m.tx_per_day_30d >= 3 && m.tx_per_day_30d <= 10) +
        Number(m.roundtrip_trades_24h_90d >= 5) +
        Number(m.avg_hold_days_90d < 3),
    },
    {
      type: "SNIPER",
      score:
        Number(m.tx_per_day_30d <= 3 && m.tx_per_day_30d >= 0.3) +
        Number(m.unique_protocols_90d <= 5) +
        Number(m.avg_hold_days_90d >= 3 && m.avg_hold_days_90d <= 20),
    },
    {
      type: "HODLER",
      score:
        Number(m.tx_per_day_30d < 0.5) +
        Number(m.avg_hold_days_90d >= 30) +
        Number(m.tx_per_day_30d === 0),
    },
  ];
};

export function inferCharacterType(metrics: CharacterMetrics): CharacterProfile {
  for (const classifier of classifiers) {
    const match = classifier(metrics);
    if (match) {
      const profile = profiles[match];
      return { type: match, ...profile };
    }
  }

  const scored = fallbackScores(metrics).sort((a, b) => b.score - a.score);
  const best = scored[0]?.type ?? "HODLER";
  return { type: best, ...profiles[best] };
}
