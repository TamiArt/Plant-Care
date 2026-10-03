ALTER TABLE plants
ADD COLUMN deleted_photo_ids TEXT NOT NULL DEFAULT '[]';

UPDATE plants
SET deleted_photo_ids = '[]'
WHERE deleted_photo_ids IS NULL;
