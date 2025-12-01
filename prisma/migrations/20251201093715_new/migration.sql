/*
  Warnings:

  - A unique constraint covering the columns `[onchainTreeId]` on the table `Tree` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Tree" ADD COLUMN     "onchainTreeId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "Tree_onchainTreeId_key" ON "Tree"("onchainTreeId");
