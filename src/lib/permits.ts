"use server";

import { createPublicClient, http, isAddress, type Address, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { TypedData } from "viem";

const getEnv = (key: string) => process.env[key];

const CHAIN_ID =
  Number(getEnv("CHAIN_ID") ?? getEnv("NEXT_PUBLIC_CHAIN_ID") ?? getEnv("VOLR_CHAIN_ID")) || 5115;
const RPC_URL =
  getEnv("RPC_URL") ?? getEnv("TREE_RPC_URL") ?? getEnv("NEXT_PUBLIC_RPC_URL") ?? "https://rpc.zetachain.com";
const TREE_NFT_ADDRESS =
  (getEnv("TREE_NFT_ADDRESS") ?? getEnv("NEXT_PUBLIC_TREE_ADDRESS"))?.toLowerCase() ?? "";
const ORNAMENT_NFT_ADDRESS =
  (getEnv("ORNAMENT_NFT_ADDRESS") ?? getEnv("NEXT_PUBLIC_ORNAMENT_ADDRESS"))?.toLowerCase() ?? "";
const SIGNER_KEY =
  getEnv("SIGNER_PRIVATE_KEY") ??
  getEnv("MINTER_KEY") ??
  getEnv("ADMIN_PRIVATE_KEY") ??
  getEnv("ORACLE_PRIVATE_KEY") ??
  "";

if (!SIGNER_KEY) {
  // Fail fast during build/runtime to surface missing secrets
  console.warn("[permits] SIGNER_PRIVATE_KEY (or MINTER_KEY) is missing");
}

const signer = SIGNER_KEY
  ? privateKeyToAccount(
      (SIGNER_KEY.startsWith("0x") ? SIGNER_KEY : `0x${SIGNER_KEY}`) as `0x${string}`,
    )
  : null;

// Minimal ABIs for permit flows
const treePermitAbi = [
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const ornamentPermitAbi = [
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ornamentRegistered",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const client = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: `chain-${CHAIN_ID}`,
    nativeCurrency: { name: "Zeta", symbol: "ZETA", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  },
  transport: http(RPC_URL),
});

export type TreeMintPermit = {
  to: Address;
  treeId: bigint;
  backgroundId: bigint;
  uri: string;
  deadline: bigint;
  nonce: bigint;
};

export type OrnamentMintPermit = {
  to: Address;
  tokenId: bigint;
  treeId: bigint;
  deadline: bigint;
  nonce: bigint;
};

const treeDomain = () => ({
  name: "ZetaTree",
  version: "1",
  chainId: BigInt(CHAIN_ID),
  verifyingContract: TREE_NFT_ADDRESS as Address,
});

const ornamentDomain = () => ({
  name: "ZetaOrnament",
  version: "1",
  chainId: BigInt(CHAIN_ID),
  verifyingContract: ORNAMENT_NFT_ADDRESS as Address,
});

const treeTypes: TypedData["types"] = {
  MintPermit: [
    { name: "to", type: "address" },
    { name: "treeId", type: "uint256" },
    { name: "backgroundId", type: "uint256" },
    { name: "uri", type: "string" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

const ornamentTypes: TypedData["types"] = {
  OrnamentMintPermit: [
    { name: "to", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "treeId", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

export const getTreeNonce = async (owner: Address) => {
  if (!isAddress(TREE_NFT_ADDRESS)) throw new Error("TREE_NFT_ADDRESS is missing/invalid");
  return (await client.readContract({
    address: TREE_NFT_ADDRESS as Address,
    abi: treePermitAbi,
    functionName: "nonces",
    args: [owner],
  })) as bigint;
};

export const getOrnamentNonce = async (owner: Address) => {
  if (!isAddress(ORNAMENT_NFT_ADDRESS)) throw new Error("ORNAMENT_NFT_ADDRESS is missing/invalid");
  return (await client.readContract({
    address: ORNAMENT_NFT_ADDRESS as Address,
    abi: ornamentPermitAbi,
    functionName: "nonces",
    args: [owner],
  })) as bigint;
};

export const isOrnamentRegistered = async (tokenId: bigint) => {
  if (!isAddress(ORNAMENT_NFT_ADDRESS)) throw new Error("ORNAMENT_NFT_ADDRESS is missing/invalid");
  return (await client.readContract({
    address: ORNAMENT_NFT_ADDRESS as Address,
    abi: ornamentPermitAbi,
    functionName: "ornamentRegistered",
    args: [tokenId],
  })) as boolean;
};

export const createTreeMintPermit = async ({
  to,
  treeId,
  backgroundId,
  uri,
  nonce,
  deadlineSeconds = 3600,
}: {
  to: Address;
  treeId: bigint;
  backgroundId: bigint;
  uri: string;
  nonce: bigint;
  deadlineSeconds?: number;
}) => {
  if (!signer) throw new Error("SIGNER_PRIVATE_KEY is not configured");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const permit: TreeMintPermit = { to, treeId, backgroundId, uri, deadline, nonce };
  const signature = await signer.signTypedData({
    domain: treeDomain(),
    types: treeTypes,
    primaryType: "MintPermit",
    message: permit,
  });
  return { permit, signature };
};

export const createOrnamentMintPermit = async ({
  to,
  tokenId,
  treeId,
  nonce,
  deadlineSeconds = 3600,
}: {
  to: Address;
  tokenId: bigint;
  treeId: bigint;
  nonce: bigint;
  deadlineSeconds?: number;
}) => {
  if (!signer) throw new Error("SIGNER_PRIVATE_KEY is not configured");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const permit: OrnamentMintPermit = { to, tokenId, treeId, deadline, nonce };
  const signature = await signer.signTypedData({
    domain: ornamentDomain(),
    types: ornamentTypes,
    primaryType: "OrnamentMintPermit",
    message: permit,
  });
  return { permit, signature };
};
