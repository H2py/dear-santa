import Link from "next/link";
import { apiFetch } from "@/src/lib/api-client";
import type { UserLite, TreeSummary, OrnamentSummary, OrnamentBalance } from "@/src/lib/types";
import { FakeTreeTransferPanel } from "@/src/components/fake-tree-transfer";

type MeResponse = {
  user: UserLite;
  trees: TreeSummary[];
  ornaments: OrnamentSummary[];
  nfts: { tokenId: string; tokenUri: string }[];
  ornamentNfts: OrnamentBalance[];
};

async function getMeSafe(origin: string) {
  try {
    return await apiFetch<MeResponse>(`${origin}/api/me`, { cache: "no-store" });
  } catch {
    return null;
  }
}

async function ensureSession(origin: string) {
  try {
    await fetch(`${origin}/api/auth/guest`, { method: "POST", cache: "no-store" });
  } catch {
    // ignore
  }
}

export default async function FakeTreePage() {
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  await ensureSession(origin);
  const data = await getMeSafe(origin);
  const ownerAddress = process.env.NEXT_PUBLIC_FAKE1_OWNER_ADDRESS ?? "";
  const ornamentAddress = process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS ?? "";
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 0);
  const senderAddress = data?.user.walletAddress ?? "지갑 연동 필요";

  return (
    <main className="min-h-screen px-4 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-emerald-300">
          ← 홈
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">Fake Tree #fake-1</span>
      </div>

      <section className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h1 className="text-xl font-bold">테스트 트리(free mint 대상)</h1>
        <p className="text-sm text-slate-300">
          이 페이지는 오너먼트 NFT 전송 테스트용입니다. 수신자는 테스트넷 주소로 고정됩니다.
        </p>
        <div className="space-y-2 text-sm text-slate-200">
          <div>
            <p className="text-xs text-slate-400">송신자(현재 세션 지갑)</p>
            <p className="font-mono text-emerald-300">{senderAddress}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">수신자(트리 소유자)</p>
            <p className="font-mono text-emerald-300">
              {ownerAddress || "환경변수 NEXT_PUBLIC_FAKE1_OWNER_ADDRESS 필요"}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            체인: {chainId || "미설정"} / 오너먼트 컨트랙트:{" "}
            {ornamentAddress || "NEXT_PUBLIC_ORNAMENT_ADDRESS 필요"}
          </p>
        </div>
      </section>

      <section className="mt-4">
        <FakeTreeTransferPanel
          ownerAddress={ownerAddress}
          ornamentAddress={ornamentAddress}
          chainId={chainId}
          ownedOrnaments={data?.ornamentNfts ?? []}
        />
      </section>
    </main>
  );
}
