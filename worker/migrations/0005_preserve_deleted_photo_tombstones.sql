DROP TRIGGER IF EXISTS cleanup_removed_plant_photos;

CREATE TRIGGER IF NOT EXISTS mark_removed_plant_photos
AFTER UPDATE OF photo_ids, deleted_at ON plants
BEGIN
  UPDATE plant_photos
  SET deleted_at = COALESCE(NEW.updated_at, CURRENT_TIMESTAMP)
  WHERE plant_id = OLD.id
    AND user_id = OLD.user_id
    AND (
      NEW.deleted_at IS NOT NULL
      OR NOT EXISTS (
        SELECT 1
        FROM json_each(NEW.photo_ids)
        WHERE json_each.value = plant_photos.id
      )
    );
END;
