-- AlterEnum
ALTER TYPE "public"."permit_status" ADD VALUE 'PENDING_PTWC';

-- AlterTable
ALTER TABLE "public"."permit_planning" ADD COLUMN "ptwc_assigned_by" INTEGER,
ADD COLUMN "ptwc_assigned_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "public"."permit_planning" ADD CONSTRAINT "permit_planning_ptwc_assigned_by_fkey" FOREIGN KEY ("ptwc_assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
