import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeDetail } from "@/src/lib/types";
import { TreeActions } from "@/src/components/tree-actions";
import { ShareActions } from "@/src/components/share-actions";
import { TreePreview } from "@/src/components/tree-preview";

async function getTree(id: string) {
  try {
    return await apiFetch<{ tree: TreeDetail }>(`/api/trees/${id}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function TreePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string; invite?: string }>;
}) {
  const { id } = await params;
  const { ref, invite } = await searchParams;
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? `${protocol}://${host}`;

  // Ensure guest session exists (avoid URL parse 오류)
  await fetch(`${origin}/api/auth/guest`, { method: "POST", cache: "no-store" });

  // Persist referrer info for later use (likes/ornaments creation)
  if (ref) {
    const store = await cookies();
    store.set({
      name: "referrer",
      value: ref,
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  // Apply invite/ref code if provided (best-effort)
  if (invite || ref) {
    await fetch(`${origin}/api/referrals/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: invite ?? ref }),
      cache: "no-store",
    }).catch(() => {});
  }

  const result = await getTree(id);
  if (!result) {
    notFound();
  }
  const { tree } = result;
  const shareRef = tree.shareCode ?? tree.owner.id;
  const shareUrl = `${origin}/tree/${tree.id}?ref=${shareRef}&tree_id=${tree.id}`;

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-300">
          ← 홈
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">
          {tree.status === "COMPLETED" ? "완성" : "진행중"}
        </span>
      </div>

      <section className="mt-4 space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Tree</p>
          <h1 className="text-xl font-bold">트리 #{tree.id.slice(0, 6)}</h1>
        </div>

        <div className="space-y-4">
          <TreePreview
            treeId={tree.id}
            background={tree.background}
            likeCount={tree.likeCount}
            liked={tree.likedByCurrentUser}
            ornaments={tree.ornaments.map((o) => ({
              slotIndex: o.slotIndex,
              imageUrl: o.imageUrl,
            }))}
          />

          <TreeActions
            treeId={tree.id}
            ornaments={tree.ornaments.map((o) => ({ slotIndex: o.slotIndex }))}
          />

          <ShareActions url={shareUrl} />
        </div>
      </section>
    </main>
  );
}
