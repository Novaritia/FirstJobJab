-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "ocr" BOOLEAN NOT NULL DEFAULT false;
