-- DropIndex
DROP INDEX "areas_geom_gist_idx";

-- AlterTable
ALTER TABLE "areas" ALTER COLUMN "created_at" SET DEFAULT NOW();
