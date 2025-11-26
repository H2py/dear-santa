-- CreateEnum
CREATE TYPE "OrnamentMintStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "OrnamentMintQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "status" "OrnamentMintStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "txHash" TEXT,
    "ornamentId" TEXT,
    "imageUrl" TEXT,
    "metadataUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OrnamentMintQueue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrnamentMintQueue" ADD CONSTRAINT "OrnamentMintQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
