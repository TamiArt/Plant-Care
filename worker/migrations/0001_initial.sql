PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_users_email
ON app_users(email);


CREATE TABLE IF NOT EXISTS plants (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,

  catalog_id TEXT,

  custom_name TEXT,
  custom_latin_name TEXT,
  custom_description TEXT,
  custom_emoji TEXT,

  nickname TEXT NOT NULL,

  photo_id TEXT,

  watering_interval INTEGER NOT NULL,
  watering_history TEXT NOT NULL DEFAULT '[]',

  misting_history TEXT NOT NULL DEFAULT '[]',

  fertilizing_interval INTEGER NOT NULL,
  fertilizing_history TEXT NOT NULL DEFAULT '[]',

  added_at TEXT NOT NULL,

  location TEXT NOT NULL,

  notes TEXT NOT NULL DEFAULT '[]',
  reminders TEXT NOT NULL DEFAULT '[]',

  external_taxon TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,

  FOREIGN KEY (user_id)
    REFERENCES app_users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plants_user_id
ON plants(user_id);

CREATE INDEX IF NOT EXISTS idx_plants_user_updated
ON plants(user_id, updated_at);


CREATE TABLE IF NOT EXISTS plant_photos (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,

  storage_key TEXT NOT NULL UNIQUE,

  mime_type TEXT NOT NULL,

  width INTEGER NOT NULL,
  height INTEGER NOT NULL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,

  FOREIGN KEY (user_id)
    REFERENCES app_users(id)
    ON DELETE CASCADE,

  FOREIGN KEY (plant_id)
    REFERENCES plants(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plant_photos_user_id
ON plant_photos(user_id);

CREATE INDEX IF NOT EXISTS idx_plant_photos_plant_id
ON plant_photos(plant_id);


CREATE TABLE IF NOT EXISTS sync_state (
  user_id TEXT PRIMARY KEY,
  last_sync_at TEXT,

  FOREIGN KEY (user_id)
    REFERENCES app_users(id)
    ON DELETE CASCADE
);