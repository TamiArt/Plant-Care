import {
  betterAuth,
} from "better-auth";

export interface AuthEnv {
  DB: D1Database;

  BETTER_AUTH_SECRET:
    string;

  APP_ORIGIN:
    string;
}

export function createAuth(
  env: AuthEnv,
) {
  return betterAuth({
    appName:
      "PlantCare",

    database:
      env.DB,

    secret:
      env.BETTER_AUTH_SECRET,

    /*
     * Public URL приложения.
     *
     * Production:
     * https://plant-care-khaki.vercel.app
     *
     * Development:
     * http://localhost:5173
     */
    baseURL:
      env.APP_ORIGIN,

    basePath:
      "/api/auth",

    trustedOrigins: [
      env.APP_ORIGIN,
    ],

    emailAndPassword: {
      enabled: true,

      requireEmailVerification:
        false,

      minPasswordLength:
        8,

      maxPasswordLength:
        128,

      autoSignIn:
        true,
    },

    session: {
      expiresIn:
        60 *
        60 *
        24 *
        30,

      updateAge:
        60 *
        60 *
        24,
    },

    advanced: {
      database: {
        generateId:
          "uuid",
      },
    },
  });
}

export type PlantCareAuth =
  ReturnType<
    typeof createAuth
  >;