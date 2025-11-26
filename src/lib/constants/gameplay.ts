export type CharacterType = "DEGEN" | "FARMER" | "NOMAD" | "LOOPER" | "SNIPER" | "HODLER";

export type CharacterProfile = {
  type: CharacterType;
  emoji: string;
  title: string;
  description: string;
};

export const SLOGAN_PRESETS: { id: number; text: string }[] = [
  { id: 1, text: "아직도 살아있다. 아직도 코핑 중이다." },
  { id: 2, text: "내가 고점에 산 게 아니라, 고점이 나를 골랐다." },
  { id: 3, text: "결국 난… 출구 유동성이었다." },
  { id: 4, text: "차트는 믿고, 현실은 그냥 코핑한다." },
  { id: 5, text: "러그 100번 버텼더니 돌아온 건 이 트리 하나뿐." },
  { id: 6, text: "농사는 다 했지만… 번 건 없다." },
  { id: 7, text: "떨어지면 산다. 안 떨어져도 산다." },
  { id: 8, text: "아직 부자는 못 됐지만… 아직도 초반이라고 믿는다." },
  { id: 9, text: "포지션은 접어도 코인은 못 접는다." },
  { id: 10, text: "수익은 안 남았지만 밈은 남았다." },
  { id: 11, text: "오늘도 탈출은 못 했지만, 경험치는 올랐다." },
  { id: 12, text: "존버는 실패해도, 다시 들어간다." },
];

export type OrnamentTagCategory = "candy" | "gift" | "doll";

export type OrnamentTagPreset = {
  id: number;
  label: string;
  category: OrnamentTagCategory;
};

export const ORNAMENT_TAGS: OrnamentTagPreset[] = [
  // 칭찬 (사탕)
  { id: 1, label: "🍬 생존자", category: "candy" },
  { id: 2, label: "🌟 꾸준함 인정", category: "candy" },
  { id: 3, label: "💪 손절 잘함", category: "candy" },
  { id: 4, label: "🔍 기회 잘 봄", category: "candy" },
  { id: 5, label: "🪙 센스 있음", category: "candy" },
  { id: 6, label: "🧩 똑똑한 움직임", category: "candy" },
  // 밈/의외 (선물상자)
  { id: 7, label: "🎁 에어드랍 노예", category: "gift" },
  { id: 8, label: "🤯 의외로 고래였음", category: "gift" },
  { id: 9, label: "📉 가만히 있었으면 부자", category: "gift" },
  { id: 10, label: "🧭 체인 유목민", category: "gift" },
  { id: 11, label: "🔀 랜덤 매수 장인", category: "gift" },
  { id: 12, label: "💸 수수료 지갑 파괴자", category: "gift" },
  // 디스/농담 (인형)
  { id: 13, label: "🧸 매도충", category: "doll" },
  { id: 14, label: "📴 손가락 좀 쉬어", category: "doll" },
  { id: 15, label: "🪦 지갑 털렸네", category: "doll" },
  { id: 16, label: "🔥 감정 과몰입러", category: "doll" },
  { id: 17, label: "🎢 롤러코스터형", category: "doll" },
  { id: 18, label: "🤦‍♂️ 왜 또 들어갔어", category: "doll" },
];

// 오너먼트 ERC1155 tokenId 프리셋 (17종)
export const ORNAMENT_TOKEN_IDS: number[] = Array.from({ length: 17 }, (_, i) => 101 + i);
