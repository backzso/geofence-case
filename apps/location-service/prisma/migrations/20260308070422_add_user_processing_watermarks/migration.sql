-- AlterTable
ALTER TABLE "outbox_events" ALTER COLUMN "available_at" SET DEFAULT NOW(),
ALTER COLUMN "created_at" SET DEFAULT NOW(),
ALTER COLUMN "updated_at" SET DEFAULT NOW();

-- AlterTable
ALTER TABLE "user_area_state" ALTER COLUMN "updated_at" SET DEFAULT NOW();

-- CreateTable
CREATE TABLE "user_processing_watermarks" (
    "user_id" UUID NOT NULL,
    "last_processed_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "user_processing_watermarks_pkey" PRIMARY KEY ("user_id")
);
