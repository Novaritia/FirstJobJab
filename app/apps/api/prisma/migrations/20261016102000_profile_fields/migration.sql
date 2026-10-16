-- AlterTable
ALTER TABLE "pii" ALTER COLUMN "birthDateEnc" DROP NOT NULL,
ALTER COLUMN "nationalIdEnc" DROP NOT NULL,
ADD COLUMN     "fullNameEnc" TEXT,
ADD COLUMN     "phoneEnc" TEXT,
ADD COLUMN     "monthlySalary" INTEGER;
