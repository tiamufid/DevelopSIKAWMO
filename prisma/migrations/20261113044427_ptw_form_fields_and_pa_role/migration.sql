-- AlterEnum
ALTER TYPE "public"."role" ADD VALUE 'PA';

-- AlterTable
ALTER TABLE "public"."permit_planning" ADD COLUMN     "equipment_identity" VARCHAR(255),
ADD COLUMN     "gas_measurement" TEXT,
ADD COLUMN     "sanction_to_test" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "simple_isolation" BOOLEAN NOT NULL DEFAULT false;
