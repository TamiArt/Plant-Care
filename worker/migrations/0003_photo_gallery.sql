ALTER TABLE plants
ADD COLUMN photo_ids TEXT NOT NULL DEFAULT '[]';

UPDATE plants
SET photo_ids = CASE
  WHEN photo_id IS NULL THEN '[]'
  ELSE json_array(photo_id)
END;

DROP TRIGGER IF EXISTS cleanup_replaced_plant_photo;

CREATE TRIGGER cleanup_removed_plant_photos
AFTER UPDATE OF photo_ids, deleted_at ON plants
BEGIN
  DELETE FROM plant_photos
  WHERE plant_id = OLD.id
    AND user_id = OLD.user_id
    AND (
      NEW.deleted_at IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM json_each(NEW.photo_ids)
        WHERE json_each.value = plant_photos.id
      )
    );
END;
