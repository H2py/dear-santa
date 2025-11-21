import type { TreeSummary } from "./types";

export const FAKE_TREES: TreeSummary[] = Array.from({ length: 10 }, (_, i) => {
  const id = `fake-${i + 1}`;
  const backgrounds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  return {
    id,
    background: backgrounds[i % backgrounds.length],
    shape: "classic",
    likeCount: 120 - i * 7,
    completedAt: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
    status: "COMPLETED",
    owner: { id: `user-${id}` },
    shareCode: null,
    ornaments: [],
    likedByCurrentUser: false,
  };
});

export const withFakeTrees = <T extends TreeSummary>(trees: T[], minCount = 10): TreeSummary[] => {
  if (trees.length >= minCount) return trees;
  return [...trees, ...FAKE_TREES.slice(0, Math.max(0, minCount - trees.length))];
};
