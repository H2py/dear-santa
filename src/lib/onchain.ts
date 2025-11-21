import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createWalletClient,
  createPublicClient,
  http,
  getContract,
  type Address,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const isValidAddress = (addr?: string | null): addr is Address =>
  typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);

const loadKey = () => {
  const raw = process.env.MINTER_KEY ?? process.env.ADMIN_PRIVATE_KEY ?? "";
  if (!raw) throw new Error("MINTER_KEY is missing");
  return raw.startsWith("0x") ? (raw as `0x${string}`) : (`0x${raw}` as `0x${string}`);
};

const loadRpcUrl = () => {
  const url = process.env.RPC_URL ?? process.env.TREE_RPC_URL;
  if (!url) throw new Error("RPC_URL (or TREE_RPC_URL) is missing");
  return url;
};

const loadAbi = (name: "tree" | "ornament"): Abi => {
  const abiPath = path.join(process.cwd(), "src", "abi", `${name}.json`);
  const json = JSON.parse(readFileSync(abiPath, "utf8"));
  return (json.abi ?? json) as Abi;
};

export const getTreeContract = () => {
  const contractAddress = process.env.NEXT_PUBLIC_TREE_ADDRESS;
  if (!isValidAddress(contractAddress)) throw new Error("NEXT_PUBLIC_TREE_ADDRESS is missing or invalid");
  const abi = loadAbi("tree");

  const account = privateKeyToAccount(loadKey());
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(loadRpcUrl()),
  });

  return getContract({
    address: contractAddress as Address,
    abi,
    client,
  });
};

export const getTreeContractPublic = () => {
  const contractAddress = process.env.NEXT_PUBLIC_TREE_ADDRESS;
  if (!isValidAddress(contractAddress)) throw new Error("NEXT_PUBLIC_TREE_ADDRESS is missing or invalid");
  const abi = loadAbi("tree");

  const client = createPublicClient({
    chain: sepolia,
    transport: http(loadRpcUrl()),
  });

  return getContract({
    address: contractAddress as Address,
    abi,
    client,
  });
};

export const fetchOwnedTokens = async (owner: Address) => {
  if (!isValidAddress(process.env.NEXT_PUBLIC_TREE_ADDRESS)) return [];
  const contract = getTreeContractPublic();
  const balance = (await contract.read.balanceOf([owner])) as bigint;
  const count = Number(balance);
  const tokens: { tokenId: string; tokenUri: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const tokenId = (await contract.read.tokenOfOwnerByIndex([owner, BigInt(i)])) as bigint;
    const tokenUri = (await contract.read.tokenURI([tokenId])) as string;
    tokens.push({ tokenId: tokenId.toString(), tokenUri });
  }
  return tokens;
};

export const getOrnamentContract = () => {
  const contractAddress = process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS;
  if (!isValidAddress(contractAddress))
    throw new Error("NEXT_PUBLIC_ORNAMENT_ADDRESS is missing or invalid");
  const abi = loadAbi("ornament");

  const account = privateKeyToAccount(loadKey());
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(loadRpcUrl()),
  });

  return getContract({
    address: contractAddress as Address,
    abi,
    client,
  });
};

export const getOrnamentContractPublic = () => {
  const contractAddress = process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS;
  if (!isValidAddress(contractAddress))
    throw new Error("NEXT_PUBLIC_ORNAMENT_ADDRESS is missing or invalid");
  const abi = loadAbi("ornament");

  const client = createPublicClient({
    chain: sepolia,
    transport: http(loadRpcUrl()),
  });

  return getContract({
    address: contractAddress as Address,
    abi,
    client,
  });
};

export const fetchOwnedOrnaments = async (owner: Address) => {
  if (!isValidAddress(process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS)) return [];
  const contract = getOrnamentContractPublic();
  const tokens: { tokenId: string; tokenUri: string }[] = [];

  // 1) 기본: ERC721Enumerable 경로
  try {
    const balance = (await contract.read.balanceOf([owner])) as bigint;
    const count = Number(balance);
    for (let i = 0; i < count; i += 1) {
      const tokenId = (await contract.read.tokenOfOwnerByIndex([owner, BigInt(i)])) as bigint;
      const tokenUri = (await contract.read.tokenURI([tokenId])) as string;
      tokens.push({ tokenId: tokenId.toString(), tokenUri });
    }
    return tokens;
  } catch (err) {
    // 일부 컨트랙트는 Enumerable을 구현하지 않으므로 이벤트 기반으로 재시도
    console.warn("Enumerable fetch failed, fallback to event scan", err);
  }

  // 2) Fallback: Transfer 이벤트를 스캔해 현재 소유 토큰 집합 계산
  try {
    const eventsTo = await contract.getEvents.Transfer({
      fromBlock: 0n,
      toBlock: "latest",
      args: { to: owner },
    });
    const eventsFrom = await contract.getEvents.Transfer({
      fromBlock: 0n,
      toBlock: "latest",
      args: { from: owner },
    });

    const owned = new Set<string>();
    for (const ev of eventsTo) {
      const tokenId = (ev as any).args?.tokenId as bigint | undefined;
      if (tokenId !== undefined) owned.add(tokenId.toString());
    }
    for (const ev of eventsFrom) {
      const tokenId = (ev as any).args?.tokenId as bigint | undefined;
      if (tokenId !== undefined) owned.delete(tokenId.toString());
    }

    for (const tokenId of owned) {
      const tokenUri = (await contract.read.tokenURI([BigInt(tokenId)])) as string;
      tokens.push({ tokenId, tokenUri });
    }
  } catch (err) {
    console.error("Event scan fetch failed", err);
  }

  return tokens;
};

type MoralisNft = { token_id?: string; token_uri?: string };

export const fetchNftsViaMoralis = async ({
  owner,
  contractAddress,
  chain = "sepolia",
}: {
  owner: Address;
  contractAddress?: string;
  chain?: string;
}) => {
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) throw new Error("MORALIS_API_KEY is missing");
  const params = new URLSearchParams({ chain });
  if (contractAddress) params.append("token_addresses", contractAddress);
  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${owner}/nfts?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) {
      // treat as empty to avoid noisy errors on unsupported plans/endpoints
      return [];
    }
    const body = await res.text();
    throw new Error(`Moralis NFT fetch failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { result?: MoralisNft[] };
  const list = Array.isArray(data.result) ? data.result : [];
  return list
    .filter((n) => typeof n.token_id === "string")
    .map((n) => ({
      tokenId: n.token_id as string,
      tokenUri: typeof n.token_uri === "string" ? (n.token_uri as string) : "",
    }));
};
