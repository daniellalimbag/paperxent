-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "balance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" VARCHAR(16) NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "averageBuyPrice" DECIMAL(20,4) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "ticker" VARCHAR(16) NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "price" DECIMAL(20,4) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Portfolio_userId_idx" ON "Portfolio"("userId");

-- CreateIndex
CREATE INDEX "Portfolio_ticker_idx" ON "Portfolio"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_ticker_key" ON "Portfolio"("userId", "ticker");

-- CreateIndex
CREATE INDEX "Transaction_userId_timestamp_idx" ON "Transaction"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "Transaction_ticker_timestamp_idx" ON "Transaction"("ticker", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "Transaction_userId_type_timestamp_idx" ON "Transaction"("userId", "type", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
