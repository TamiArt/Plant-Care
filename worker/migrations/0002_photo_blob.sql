PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS plant_photos;

CREATE TABLE plant_photos (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,

  photo_blob BLOB NOT NULL,

  mime_type TEXT NOT NULL,

  width INTEGER NOT NULL,
  height INTEGER NOT NULL,

  byte_size INTEGER NOT NULL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (user_id)
    REFERENCES app_users(id)
    ON DELETE CASCADE,

  FOREIGN KEY (plant_id)
    REFERENCES plants(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_plant_photos_user_id
ON plant_photos(user_id);

CREATE INDEX idx_plant_photos_plant_id
ON plant_photos(plant_id);


/*
 * Если пользователь:
 *
 * - заменил фотографию;
 * - удалил фотографию;
 * - удалил само растение,
 *
 * старая бинарная фотография больше
 * не должна занимать место в D1.
 */
CREATE TRIGGER cleanup_replaced_plant_photo
AFTER UPDATE OF photo_id, deleted_at
ON plants

WHEN
  OLD.photo_id IS NOT NULL
  AND (
    NEW.photo_id IS NULL
    OR NEW.photo_id <> OLD.photo_id
    OR NEW.deleted_at IS NOT NULL
  )

BEGIN
  DELETE FROM plant_photos
  WHERE
    id = OLD.photo_id
    AND user_id = OLD.user_id;
END;