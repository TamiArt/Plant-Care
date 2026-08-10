import { authClient } from "../authClient";
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

  const { error } =
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
      error:
        error.message ??
        "Не удалось создать аккаунт.",
    };
  }

  return {
    ok: true,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const { error } =
    await authClient.signIn.email({
      email: normalizeEmail(email),
      password,
      rememberMe: true,
    });

  if (error) {
    return {
      ok: false,
      error:
        error.message ??
        "Неверная почта или пароль.",
    };
  }

  return {
    ok: true,
  };
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
  const { data, error } =
    await authClient.getSession();

  if (error || !data) {
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