import { authClient } from "../authClient";
import { getAuthErrorMessage } from "../authErrors";
import type {
  AuthResult,
  AuthSession,
  AuthUser,
} from "../types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createAutomaticName(
  email: string,
): string {
  const normalized = normalizeEmail(email);

  const localPart =
    normalized.split("@")[0]?.trim();

  return localPart || "PlantCare";
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof TypeError) {
    return "Сервер аккаунтов недоступен. Проверьте интернет и адрес приложения, затем повторите попытку.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Не удалось выполнить операцию.";
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalizedEmail =
    normalizeEmail(email);

  try {
    const { data, error } =
      await authClient.signUp.email({
        email: normalizedEmail,
        password,
        /*
         * Better Auth требует name.
         * Пользователю это поле не показываем.
         */
        name:
          createAutomaticName(
            normalizedEmail,
          ),
      });

    if (error) {
      return {
        ok: false,
        error: getAuthErrorMessage(
          error,
          "Не удалось создать аккаунт.",
        ),
      };
    }

    /*
     * Раньше отсутствие error считалось успешной регистрацией даже при
     * пустом ответе прокси. Из-за этого окно закрывалось, хотя аккаунт мог
     * фактически не создаться.
     */
    if (!data?.user?.id) {
      return {
        ok: false,
        error: "Сервер не подтвердил создание аккаунта. Повторите попытку; локальные растения не потеряны.",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { data, error } =
      await authClient.signIn.email({
        email: normalizeEmail(email),
        password,
        rememberMe: true,
      });

    if (error) {
      return {
        ok: false,
        error: getAuthErrorMessage(
          error,
          "Неверная почта или пароль.",
        ),
      };
    }

    if (!data?.user?.id) {
      return {
        ok: false,
        error: "Сервер не подтвердил вход. Проверьте адрес приложения и повторите попытку.",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function signOut():
  Promise<AuthResult> {
  try {
    const { error } =
      await authClient.signOut();

    if (error) {
      return {
        ok: false,
        error:
          error.message ??
          "Не удалось выйти из аккаунта.",
      };
    }

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function getCurrentSession():
  Promise<{
    user: AuthUser | null;
    session: AuthSession | null;
  }> {
  /*
   * Уникальный query-параметр обходит Cache Storage старого service worker,
   * который ошибочно кешировал GET /api/auth/get-session. cache: no-store
   * дополнительно запрещает обычное HTTP-кеширование сессии.
   */
  const { data, error } =
    await authClient.$fetch<{
      user: AuthUser;
      session: AuthSession;
    }>("/get-session", {
      cache: "no-store",
      query: {
        plantcareRequest:
          Date.now().toString(),
      },
    });

  if (error) {
    throw new Error(
      getAuthErrorMessage(
        error,
        "Не удалось проверить сессию аккаунта.",
      ),
    );
  }

  if (!data) {
    return {
      user: null,
      session: null,
    };
  }

  return {
    user: data.user as AuthUser,
    session: data.session as AuthSession,
  };
}
