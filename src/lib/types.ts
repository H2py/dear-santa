import { OrnamentType, TreeStatus } from "@prisma/client";

export type TreeSummary = {
  id: string;
  background: string;
  shape: string;
  status: TreeStatus;
  likeCount: number;
  completedAt: string | null;
};

export type OrnamentSummary = {
  id: string;
  treeId: string;
  slotIndex: number;
  type: OrnamentType;
  imageUrl: string;
  ownerId: string;
};

export type TreeDetail = TreeSummary & {
  owner: { id: string };
  shareCode?: string | null;
  ornaments: OrnamentSummary[];
  likedByCurrentUser: boolean;
};

export type UserLite = {
  id: string;
  gachaTickets: number;
  totalLikesUsed: number;
  walletAddress: string | null;
};
