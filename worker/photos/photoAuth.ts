import {
  createAuth,
} from "../auth";

import type {
  AuthenticatedPhotoUser,
  PhotoEnv,
} from "./photoTypes";

export async function requirePhotoUser(
  request: Request,
  env: PhotoEnv,
): Promise<
  AuthenticatedPhotoUser | null
> {
  const auth =
    createAuth(env);

  const session =
    await auth.api.getSession({
      headers: request.headers,
    });

  if (!session?.user) {
    return null;
  }

  return {
    id:
      session.user.id,

    email:
      session.user.email,
  };
}