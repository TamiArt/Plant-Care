import {
  createAuth,
  type AuthEnv,
} from "./auth";

import {
  handleGetPlants,
  handleSyncPlants,
} from "./sync";

import {
  handleDeletePhoto,
  handleGetPhoto,
  handlePutPhoto,
} from "./photos/photoRoutes";

export interface Env extends AuthEnv {
  APP_ENV: string;
}

function json(
  data: unknown,
  init: ResponseInit = {},
): Response {
  const headers =
    new Headers(init.headers);

  headers.set(
    "Content-Type",
    "application/json; charset=utf-8",
  );

  return new Response(
    JSON.stringify(data),
    {
      ...init,
      headers,
    },
  );
}

function isAllowedOrigin(
  origin: string | null,
): origin is string {
  return (
    origin ===
      "http://localhost:5173" ||
    origin ===
      "http://localhost:4173"
  );
}

function withCors(
  response: Response,
  request: Request,
): Response {
  const origin =
    request.headers.get("Origin");

  const headers =
    new Headers(
      response.headers,
    );

  if (
    isAllowedOrigin(origin)
  ) {
    headers.set(
      "Access-Control-Allow-Origin",
      origin,
    );

    headers.set(
      "Access-Control-Allow-Credentials",
      "true",
    );

    headers.set(
      "Vary",
      "Origin",
    );
  }

  return new Response(
    response.body,
    {
      status: response.status,
      statusText:
        response.statusText,
      headers,
    },
  );
}

function corsPreflight(
  request: Request,
): Response {
  const origin =
    request.headers.get("Origin");

  const headers =
    new Headers();

  if (
    isAllowedOrigin(origin)
  ) {
    headers.set(
      "Access-Control-Allow-Origin",
      origin,
    );

    headers.set(
      "Access-Control-Allow-Credentials",
      "true",
    );

    headers.set(
      "Vary",
      "Origin",
    );
  }

  headers.set(
    "Access-Control-Allow-Methods",
    [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ].join(", "),
  );

  headers.set(
  "Access-Control-Allow-Headers",
  [
    "Content-Type",
    "Authorization",
    "X-Plant-Id",
    "X-Photo-Width",
    "X-Photo-Height",
    "X-Photo-Updated-At",
    ].join(", "),
  );

  headers.set(
    "Access-Control-Max-Age",
    "86400",
  );

  return new Response(
    null,
    {
      status: 204,
      headers,
    },
  );
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url =
      new URL(request.url);

    /*
     * CORS preflight.
     */
    if (
      request.method === "OPTIONS"
    ) {
      return corsPreflight(
        request,
      );
    }

    /*
     * Root endpoint.
     */
    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return json({
        name: "PlantCare API",
        status: "ok",
        environment:
          env.APP_ENV,
      });
    }

    /*
     * Проверка Worker + D1.
     */
    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      try {
        const result =
          await env.DB
            .prepare(
              `
                SELECT
                  COUNT(*) AS userCount
                FROM app_users
              `,
            )
            .first<{
              userCount: number;
            }>();

        return json({
          ok: true,
          database: true,
          users:
            result?.userCount ??
            0,
          timestamp:
            new Date()
              .toISOString(),
        });
      } catch (error) {
        console.error(
          "D1 health check failed:",
          error,
        );

        return json(
          {
            ok: false,
            database: false,
          },
          {
            status: 500,
          },
        );
      }
    }

    /*
     * Better Auth.
     */
    if (
      url.pathname.startsWith(
        "/api/auth/",
      )
    ) {
      const auth =
        createAuth(env);

      const response =
        await auth.handler(
          request,
        );

      return withCors(
        response,
        request,
      );
    }

    /*
     * Photo binary API.
     *
     * /api/photos/:photoId
     */
    if (
      url.pathname.startsWith(
        "/api/photos/",
      )
    ) {
      const photoId =
        decodeURIComponent(
          url.pathname.slice(
            "/api/photos/".length,
          ),
        );

      if (
        !photoId ||
        photoId.includes("/")
      ) {
        return withCors(
          json(
            {
              error:
                "Некорректный photoId.",
            },
            {
              status: 400,
            },
          ),
          request,
        );
      }

      try {
        let response:
          Response;

        if (
          request.method ===
          "PUT"
        ) {
          response =
            await handlePutPhoto(
              request,
              env,
              photoId,
            );
        } else if (
          request.method ===
          "GET"
        ) {
          response =
            await handleGetPhoto(
              request,
              env,
              photoId,
            );
        } else if (
          request.method ===
          "DELETE"
        ) {
          response =
            await handleDeletePhoto(
              request,
              env,
              photoId,
            );
        } else {
          response =
            json(
              {
                error:
                  "Method not allowed",
              },
              {
                status: 405,
              },
            );
        }

        return withCors(
          response,
          request,
        );
      } catch (error) {
        console.error(
          "Photo API failed:",
          error,
        );

        return withCors(
          json(
            {
              error:
                "Не удалось обработать фотографию.",
            },
            {
              status: 500,
            },
          ),
          request,
        );
      }
    }

    /*
     * Получение всех растений
     * текущего пользователя.
     */
    if (
      request.method === "GET" &&
      url.pathname ===
        "/api/sync/plants"
    ) {
      try {
        const response =
          await handleGetPlants(
            request,
            env,
          );

        return withCors(
          response,
          request,
        );
      } catch (error) {
        console.error(
          "GET plant sync failed:",
          error,
        );

        return withCors(
          json(
            {
              error:
                "Не удалось получить растения.",
            },
            {
              status: 500,
            },
          ),
          request,
        );
      }
    }

    /*
     * Last Write Wins sync.
     */
    if (
      request.method === "POST" &&
      url.pathname ===
        "/api/sync/plants"
    ) {
      try {
        const response =
          await handleSyncPlants(
            request,
            env,
          );

        return withCors(
          response,
          request,
        );
      } catch (error) {
        console.error(
          "POST plant sync failed:",
          error,
        );

        return withCors(
          json(
            {
              error:
                "Не удалось синхронизировать растения.",
            },
            {
              status: 500,
            },
          ),
          request,
        );
      }
    }

    return json(
      {
        error: "Not found",
      },
      {
        status: 404,
      },
    );
  },
} satisfies ExportedHandler<Env>;