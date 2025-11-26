export type TreeStatus = "DRAFT" | "COMPLETED";
export type OrnamentType = "FREE_GACHA" | "PAID_UPLOAD";
export type CharacterType = "DEGEN" | "FARMER" | "NOMAD" | "LOOPER" | "SNIPER" | "HODLER";

export type TreeSummary = {
  id: string;
  background: string;
  shape: string;
  status: TreeStatus;
  likeCount: number;
  completedAt: string | null;
  characterReportId?: string | null;
  sloganId?: number | null;
  sloganCustom?: string | null;
};

export type OrnamentSummary = {
  id: string;
  treeId: string;
  slotIndex: number;
  type: OrnamentType;
  imageUrl: string;
  ownerId: string;
  tagId?: number | null;
  tagText?: string | null;
};

export type OrnamentBalance = {
  tokenId: string;
  tokenUri: string;
  balance: number;
};

export type TreeDetail = TreeSummary & {
  owner: { id: string };
  shareCode?: string | null;
  ornaments: OrnamentSummary[];
  likedByCurrentUser: boolean;
  pinnedOrnamentIds?: string[] | null;
  character?: CharacterProfile | null;
};

export type UserLite = {
  id: string;
  gachaTickets: number;
  totalLikesUsed: number;
  walletAddress: string | null;
};

export type CharacterProfile = {
  type: CharacterType;
  emoji: string;
  title: string;
  description: string;
};

export type SloganPreset = {
  id: number;
  text: string;
};

export type OrnamentTag = {
  id: number;
  label: string;
  category: "candy" | "gift" | "doll";
};
