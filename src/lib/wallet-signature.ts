const formatYearLine = (year?: number | string) => {
  if (year === undefined || year === null) return "";
  const str = String(year).trim();
  return str ? `\nYear: ${str}` : "";
};

export const buildWalletProofMessage = (address: string, issuedYear?: number | string) =>
  `지갑 주소 한 번 입력으로 온체인 리포트를 받아보세요.\nAddress: ${address.toLowerCase()}${formatYearLine(issuedYear)}`;

export const buildTreeCreationMessage = (address: string, treeId: string, issuedAt: string) =>
  `Dear Santa - 크리스마스 트리 NFT 발행\n\n지갑: ${address.toLowerCase()}\n트리 ID: ${treeId}\n\n이 메시지에 서명하여 트리를 NFT로 발행합니다.\n타임스탬프: ${issuedAt}`;