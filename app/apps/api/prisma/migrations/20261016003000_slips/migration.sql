-- CreateTable
CREATE TABLE "slips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "qrRef" TEXT,
    "ref" TEXT,
    "bank" TEXT,
    "date" TEXT,
    "time" TEXT,
    "amount" INTEGER,
    "toName" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "matchedTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slips_userId_sha256_key" ON "slips"("userId", "sha256");

-- CreateIndex
CREATE INDEX "slips_userId_qrRef_idx" ON "slips"("userId", "qrRef");

-- AddForeignKey
ALTER TABLE "slips" ADD CONSTRAINT "slips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
