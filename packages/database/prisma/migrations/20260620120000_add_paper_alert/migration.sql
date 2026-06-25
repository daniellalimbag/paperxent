-- CreateEnum
CREATE TYPE "PaperAlertType" AS ENUM ('PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_UP', 'PERCENT_DOWN');

-- CreateTable
CREATE TABLE "PaperAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" VARCHAR(16) NOT NULL,
    "type" "PaperAlertType" NOT NULL,
    "targetPrice" DECIMAL(20,4),
    "percentThreshold" DECIMAL(10,6),
    "baselinePrice" DECIMAL(20,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "triggeredPrice" DECIMAL(20,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperAlert_userId_isActive_createdAt_idx" ON "PaperAlert"("userId", "isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PaperAlert_ticker_isActive_idx" ON "PaperAlert"("ticker", "isActive");

-- AddForeignKey
ALTER TABLE "PaperAlert" ADD CONSTRAINT "PaperAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
