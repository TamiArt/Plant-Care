ALTER TABLE plants
ADD COLUMN misting_enabled INTEGER NOT NULL DEFAULT 1;

ALTER TABLE plants
ADD COLUMN supplemental_light TEXT;
