import { headers } from "next/headers";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeDetail, TreeSummary } from "@/src/lib/types";
import { HomeHero } from "@/src/components/home-hero";

async function ensureSession(origin: string) {
  try {
    await fetch(`${origin}/api/auth/guest`, { method: "POST", cache: "no-store" });
  } catch {
    // ignore
  }
}

async function getMyTrees(origin: string) {
  try {
    const data = await apiFetch<{ trees: TreeSummary[] }>(`${origin}/api/trees`, {
      cache: "no-store",
    });
    return data.trees;
  } catch {
    return [];
  }
}

async function getTreeDetail(origin: string, id: string) {
  return apiFetch<{ tree: TreeDetail }>(`${origin}/api/trees/${id}`, { cache: "no-store" });
}

type SearchParams = { treeId?: string };

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const { treeId } = params ?? {};
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? `${protocol}://${host}`;

  await ensureSession(origin);

  const myTrees = await getMyTrees(origin);
  const primaryTreeId = treeId ?? myTrees[0]?.id;
  let primaryTree: TreeDetail | null = null;
  if (primaryTreeId) {
    try {
      const detail = await getTreeDetail(origin, primaryTreeId);
      primaryTree = detail.tree;
    } catch {
      primaryTree = null;
    }
  }

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <HomeHero primaryTree={primaryTree} />
    </main>
  );
}
