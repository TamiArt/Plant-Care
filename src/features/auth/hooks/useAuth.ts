import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getCurrentSession,
  signInWithEmail,
  signOut as signOutFromRepository,
  signUpWithEmail,
} from "../repository/authRepository";

import type {
  AuthResult,
  AuthSession,
  AuthUser,
} from "../types";

export function useAuth() {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [session, setSession] =
    useState<AuthSession | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refreshSession =
    useCallback(async () => {
      try {
        const current =
          await getCurrentSession();

        setUser(current.user);
        setSession(current.session);
        setError(null);
      } catch (reason) {
        console.error(
          "Auth session loading failed:",
          reason,
        );

        setUser(null);
        setSession(null);

        setError(
          "Не удалось проверить аккаунт.",
        );
      }
    }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const current =
          await getCurrentSession();

        if (!active) {
          return;
        }

        setUser(current.user);
        setSession(current.session);
      } catch (reason) {
        console.error(
          "Auth initialization failed:",
          reason,
        );

        if (active) {
          setError(
            "Не удалось проверить аккаунт.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<AuthResult> => {
      setError(null);

      const result =
        await signUpWithEmail(
          email,
          password,
        );

      if (!result.ok) {
        setError(
          result.error ??
            "Не удалось создать аккаунт.",
        );

        return result;
      }

      await refreshSession();

      return {
        ok: true,
      };
    },
    [refreshSession],
  );

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<AuthResult> => {
      setError(null);

      const result =
        await signInWithEmail(
          email,
          password,
        );

      if (!result.ok) {
        setError(
          result.error ??
            "Не удалось войти.",
        );

        return result;
      }

      await refreshSession();

      return {
        ok: true,
      };
    },
    [refreshSession],
  );

  const logout = useCallback(
    async (): Promise<AuthResult> => {
      setError(null);

      const result =
        await signOutFromRepository();

      if (!result.ok) {
        setError(
          result.error ??
            "Не удалось выйти.",
        );

        return result;
      }

      setUser(null);
      setSession(null);

      return {
        ok: true,
      };
    },
    [],
  );

  return {
    user,
    session,

    isAuthenticated:
      Boolean(user && session),

    isLoading,
    error,

    register,
    login,
    logout,
    refreshSession,
  };
}