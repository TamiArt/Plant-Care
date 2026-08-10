import {
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";

import {
  motion,
} from "motion/react";

import type {
  AuthResult,
} from "../types";

type AuthMode =
  | "login"
  | "register";

export interface AuthSheetProps {
  onLogin: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;

  onRegister: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;

  onClose: () => void;
}

export function AuthSheet({
  onLogin,
  onRegister,
  onClose,
}: AuthSheetProps) {
  const [mode, setMode] =
    useState<AuthMode>("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const isRegister =
    mode === "register";

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 8 &&
    !isSubmitting;

  const handleSubmit =
    async () => {
      if (!canSubmit) {
        return;
      }

      setIsSubmitting(true);
      setError("");

      const result = isRegister
        ? await onRegister(
            email,
            password,
          )
        : await onLogin(
            email,
            password,
          );

      setIsSubmitting(false);

      if (result.ok) {
        onClose();
        return;
      }

      setError(
        result.error ??
          "Не удалось выполнить операцию.",
      );
    };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={
          isSubmitting
            ? undefined
            : onClose
        }
      />

      <motion.div
        initial={{
          y: "100%",
        }}
        animate={{
          y: 0,
        }}
        exit={{
          y: "100%",
        }}
        transition={{
          type: "spring",
          damping: 28,
          stiffness: 280,
        }}
        className="
          relative
          w-full
          max-w-md
          rounded-t-3xl
          bg-background
          px-5
          pb-8
          pt-3
          shadow-2xl
        "
      >
        <div className="mb-4 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isRegister
                ? "Создать аккаунт"
                : "Войти"}
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {isRegister
                ? "Синхронизируйте растения между телефоном и компьютером."
                : "Войдите, чтобы получить свои растения на этом устройстве."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-muted
              text-muted-foreground
              disabled:opacity-40
            "
            aria-label="Закрыть"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Почта
            </label>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={event =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="name@example.com"
              disabled={isSubmitting}
              className="
                w-full
                rounded-2xl
                bg-muted
                px-4
                py-3.5
                text-sm
                outline-none
                placeholder:text-muted-foreground
                focus:ring-2
                focus:ring-primary/30
                disabled:opacity-50
              "
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Пароль
            </label>

            <div className="relative">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete={
                  isRegister
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={event =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Минимум 8 символов"
                disabled={isSubmitting}
                className="
                  w-full
                  rounded-2xl
                  bg-muted
                  py-3.5
                  pl-4
                  pr-12
                  text-sm
                  outline-none
                  placeholder:text-muted-foreground
                  focus:ring-2
                  focus:ring-primary/30
                  disabled:opacity-50
                "
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    value => !value,
                  )
                }
                className="
                  absolute
                  right-3
                  top-1/2
                  flex
                  h-8
                  w-8
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-full
                  text-muted-foreground
                "
                aria-label={
                  showPassword
                    ? "Скрыть пароль"
                    : "Показать пароль"
                }
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>

            {isRegister && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Используйте пароль длиной
                не менее 8 символов.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              void handleSubmit()
            }
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-primary
              py-3.5
              text-sm
              font-semibold
              text-primary-foreground
              transition-opacity
              disabled:opacity-40
            "
          >
            {isRegister ? (
              <UserPlus size={17} />
            ) : (
              <LogIn size={17} />
            )}

            {isSubmitting
              ? "Подождите…"
              : isRegister
                ? "Создать аккаунт"
                : "Войти"}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setMode(
                current =>
                  current === "login"
                    ? "register"
                    : "login",
              );

              setError("");
            }}
            className="
              w-full
              py-2
              text-center
              text-sm
              font-medium
              text-primary
              disabled:opacity-40
            "
          >
            {isRegister
              ? "Уже есть аккаунт? Войти"
              : "Нет аккаунта? Создать"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}