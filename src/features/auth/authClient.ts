import {
  createAuthClient,
} from "better-auth/react";

/**
 * API авторизации работает
 * на том же origin, что и приложение:
 *
 * production:
 * https://plant-care-khaki.vercel.app/api/auth/*
 *
 * development:
 * http://localhost:5173/api/auth/*
 *
 * В development Vite проксирует /api
 * на localhost:8787.
 *
 * В production Vercel проксирует /api
 * на Cloudflare Worker.
 */
export const authClient =
  createAuthClient();