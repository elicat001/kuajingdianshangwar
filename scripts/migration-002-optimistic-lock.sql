-- Migration 002: Add optimistic locking version columns
-- Required by TypeORM @VersionColumn() decorators

BEGIN;

ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE sku_master
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

COMMIT;
