import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { apiFetch } from "@/src/lib/api-client";
import type { TreeDetail } from "@/src/lib/types";
import { HomeHero } from "@/src/components/home-hero";

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

  return (
    <main className="min-h-screen px-4 pb-10 pt-4">
      <div className="mb-3 flex items-center justify-between text-white">
        <Link href="/" className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white shadow">
          ← 홈
        </Link>
        <span className="text-[11px] uppercase tracking-[0.25em] text-white/80">
          {tree.status === "COMPLETED" ? "완성" : "진행중"}
        </span>
      </div>
      <HomeHero primaryTree={tree} />
    </main>
  );
}
