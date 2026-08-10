import type {
  AuthEnv,
} from "../auth";

export interface PhotoEnv
  extends AuthEnv {
  APP_ENV: string;
}

export interface AuthenticatedPhotoUser {
  id: string;
  email: string;
}

export interface CloudPhotoRow {
  id: string;

  user_id: string;
  plant_id: string;

  photo_blob: number[];

  mime_type: string;

  width: number;
  height: number;

  byte_size: number;

  created_at: string;
  updated_at: string;
}

export interface PhotoMetadataRow {
  id: string;

  user_id: string;
  plant_id: string;

  mime_type: string;

  width: number;
  height: number;

  byte_size: number;

  created_at: string;
  updated_at: string;
}

export interface PlantOwnershipRow {
  id: string;
  user_id: string;
  photo_id: string | null;
  deleted_at: string | null;
}