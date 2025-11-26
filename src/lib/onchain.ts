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
import { ORNAMENT_TOKEN_IDS } from "@/src/lib/constants/gameplay";

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

type MoralisNft = { token_id?: string; token_uri?: string };
export type OrnamentBalance = { tokenId: string; tokenUri: string; balance: number };

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

export const fetchOwnedOrnaments = async (
  owner: Address,
  tokenIds: number[] = ORNAMENT_TOKEN_IDS
): Promise<OrnamentBalance[]> => {
  if (!isValidAddress(process.env.NEXT_PUBLIC_ORNAMENT_ADDRESS)) return [];
  const contract = getOrnamentContractPublic();

  // balanceOfBatch expects equal-length arrays
  const addrs = tokenIds.map(() => owner);
  const balances = (await contract.read.balanceOfBatch([addrs, tokenIds])) as bigint[];

  const result: OrnamentBalance[] = [];
  for (let i = 0; i < tokenIds.length; i++) {
    const bal = Number(balances[i]);
    if (bal > 0) {
      const uri = (await contract.read.uri([BigInt(tokenIds[i])])) as string;
      result.push({ tokenId: tokenIds[i].toString(), tokenUri: uri, balance: bal });
    }
  }
  return result;
};

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
