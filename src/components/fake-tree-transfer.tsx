/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { isAddress, encodeFunctionData, type Abi, type EIP1193Provider } from "viem";
import ornamentAbi from "@/src/abi/ornament.json";

type Owned = { tokenId: string; tokenUri: string };

type Props = {
  ownerAddress: string;
  ornamentAddress: string;
  chainId: number;
  ownedOrnaments: Owned[];
};

export function FakeTreeTransferPanel({
  ownerAddress,
  ornamentAddress,
  chainId,
  ownedOrnaments,
}: Props) {
  const [selectedToken, setSelectedToken] = useState<string | null>(ownedOrnaments[0]?.tokenId ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsedOwned = useMemo(
    () =>
      ownedOrnaments.map((o) => ({
        ...o,
        name: o.tokenUri.includes("name")
          ? (() => {
              try {
                const meta = JSON.parse(decodeURIComponent(o.tokenUri.replace("data:application/json;utf8,", "")));
                return meta?.name ?? `Ornament #${o.tokenId}`;
              } catch {
                return `Ornament #${o.tokenId}`;
              }
            })()
          : `Ornament #${o.tokenId}`,
      })),
    [ownedOrnaments]
  );

  const ensureChain = async (eth: EIP1193Provider) => {
    if (!chainId) return;
    const current = await eth.request({ method: "eth_chainId" });
    const currentDec = Number(current);
    if (currentDec === chainId) return;
    const hexChain = `0x${chainId.toString(16)}`;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChain }] });
    } catch {
      throw new Error(`지갑 네트워크를 ${chainId} (0x${chainId.toString(16)}) 로 바꿔주세요.`);
    }
  };

  const handleTransfer = async () => {
    setMessage(null);
    setTxHash(null);
    if (!selectedToken) {
      setMessage("전송할 오너먼트를 선택하세요.");
      return;
    }
    if (!isAddress(ownerAddress)) {
      setMessage("수신자 주소(NEXT_PUBLIC_FAKE1_OWNER_ADDRESS)가 올바르지 않습니다.");
      return;
    }
    if (!isAddress(ornamentAddress)) {
      setMessage("오너먼트 컨트랙트 주소가 올바르지 않습니다.");
      return;
    }
    const eth = (window as typeof window & { ethereum?: EIP1193Provider }).ethereum;
    if (!eth) {
      setMessage("지갑이 감지되지 않았습니다 (MetaMask 등 설치 필요)");
      return;
    }

    setLoading(true);
    try {
      await ensureChain(eth);
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const from = accounts?.[0];
      if (!from) throw new Error("지갑 주소를 가져올 수 없습니다.");

      const abi = (ornamentAbi as unknown as { abi: Abi }).abi;
      const data = encodeFunctionData({
        abi,
        functionName: "safeTransferFrom",
        args: [from as `0x${string}`, ownerAddress as `0x${string}`, BigInt(selectedToken)],
      });

      const txParams = [{ from, to: ornamentAddress as `0x${string}`, data }];
      const hash = (await eth.request({
        method: "eth_sendTransaction",
        params: txParams as unknown as [Record<string, string>],
      })) as string;
      setTxHash(hash);
      setMessage("전송 요청을 보냈습니다. Etherscan에서 확인하세요.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "전송에 실패했습니다.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">오너먼트 전송 (fake-1)</h2>
        <span className="text-xs text-emerald-300">{ownedOrnaments.length}개 보유</span>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-slate-300">내 오너먼트</label>
        {parsedOwned.length > 0 ? (
          <select
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
            value={selectedToken ?? ""}
            onChange={(e) => setSelectedToken(e.target.value)}
          >
            {parsedOwned.map((o) => (
              <option key={o.tokenId} value={o.tokenId}>
                #{o.tokenId} — {o.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3 text-sm text-slate-300">
            보유한 오너먼트 NFT가 없습니다. 가챠 후 다시 시도하세요.
          </div>
        )}
      </div>
      <div className="text-sm text-slate-300">
        수신자:{" "}
        <span className="font-mono text-emerald-300">{ownerAddress || "환경변수를 설정하세요"}</span>
      </div>
      <button
        onClick={handleTransfer}
        disabled={loading || !selectedToken || !isAddress(ownerAddress) || !isAddress(ornamentAddress)}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-center text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 disabled:opacity-60"
      >
        {loading ? "전송 중..." : "오너먼트 전송하기"}
      </button>
      {message && (
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-slate-200">
          {message}
        </div>
      )}
      {txHash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg border border-emerald-300/50 bg-emerald-400/10 p-3 text-xs font-semibold text-emerald-200 underline"
        >
          Etherscan에서 트랜잭션 확인
        </a>
      )}
    </div>
  );
}
