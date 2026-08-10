import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  AnimatePresence,
  motion,
} from "motion/react";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  LogIn,
  LogOut,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import type {
  UserPlant,
} from "../../garden/types";

import type {
  GardenSyncStatus,
} from "../../garden/hooks/useGarden";

import {
  SyncStatusCard,
} from "./SyncStatusCard";

import type {
  AuthResult,
  AuthUser,
} from "../../auth";

import {
  createBackup,
  downloadBackup,
  mergeBackupPlants,
  parseBackup,
  type PlantCareSettings,
} from "../backup";

export interface DataSheetProps {
  plants: UserPlant[];
  settings: PlantCareSettings;
  authUser: AuthUser | null;
  authLoading: boolean;
  syncStatus:
    GardenSyncStatus;
  syncError:
    string | null;
  lastSyncedAt:
    string | null;

  onSync: () => void;  

  onOpenAuth: () => void;

  onLogout: () => Promise<AuthResult>;

  onImport: (
    plants: UserPlant[],
    settings: PlantCareSettings | null,
    mode: "replace" | "merge",
  ) => void;

  onClose: () => void;
}

export function DataSheet({
  plants,
  settings,
  authUser,
  authLoading,

  syncStatus,
  syncError,
  lastSyncedAt,
  onSync,

  onOpenAuth,
  onLogout,
  onImport,
  onClose,
}: DataSheetProps) {
  const fileRef =
    useRef<HTMLInputElement>(null);

  const [status, setStatus] =
    useState<
      "idle" | "success" | "error"
    >("idle");

  const [errorMsg, setErrorMsg] =
    useState("");

  const [
    importedCount,
    setImportedCount,
  ] = useState(0);

  const [mergeMode, setMergeMode] =
    useState<"replace" | "merge">(
      "merge",
    );

  const [
    logoutLoading,
    setLogoutLoading,
  ] = useState(false);

  const [
    logoutError,
    setLogoutError,
  ] = useState("");

  const handleLogout = async () => {
    if (logoutLoading) {
      return;
    }

    setLogoutLoading(true);
    setLogoutError("");

    const result =
      await onLogout();

    setLogoutLoading(false);

    if (!result.ok) {
      setLogoutError(
        result.error ??
          "Не удалось выйти из аккаунта.",
      );
    }
  };

  const handleFile = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        const parsed =
          JSON.parse(
            reader.result as string,
          );

        const result =
          parseBackup(parsed);

        if (!result.backup) {
          setStatus("error");

          setErrorMsg(
            result.error ??
              "Файл повреждён или имеет неверный формат.",
          );

          e.target.value = "";

          return;
        }

        const backup =
          result.backup;

        if (mergeMode === "merge") {
          const merged =
            mergeBackupPlants(
              plants,
              backup.plants,
            );

          onImport(
            merged.plants,
            null,
            "merge",
          );

          setImportedCount(
            merged.addedCount,
          );
        } else {
          onImport(
            backup.plants,
            backup.settings,
            "replace",
          );

          setImportedCount(
            backup.plants.length,
          );
        }

        setStatus("success");
      } catch {
        setStatus("error");

        setErrorMsg(
          "Не удалось прочитать файл. Убедитесь, что это JSON.",
        );
      }

      e.target.value = "";
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
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
          max-h-[90dvh]
          w-full
          max-w-md
          overflow-y-auto
          rounded-t-3xl
          bg-background
        "
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-8 pt-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Мои данные
              </h2>

              <p className="text-xs text-muted-foreground">
                {plants.length} растений в саду
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                bg-muted
              "
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          {/* ACCOUNT */}

          <div className="mb-3 rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-start gap-3">
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-secondary
                  text-primary
                "
              >
                <UserRound size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Аккаунт
                </p>

                {authLoading ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Проверяем вход…
                  </p>
                ) : authUser ? (
                  <>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {authUser.email}
                    </p>

                    <p className="mt-1 text-[11px] text-emerald-700">
                      Вы вошли в PlantCare
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Войдите, чтобы использовать
                    один аккаунт на телефоне
                    и компьютере.
                  </p>
                )}
              </div>
            </div>

            {!authLoading && !authUser && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-primary
                  py-3
                  text-sm
                  font-medium
                  text-primary-foreground
                "
              >
                <LogIn size={16} />

                Войти или создать аккаунт
              </button>
            )}

            {!authLoading && authUser && (
              <button
                type="button"
                disabled={logoutLoading}
                onClick={() =>
                  void handleLogout()
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-border
                  py-3
                  text-sm
                  font-medium
                  text-foreground
                  disabled:opacity-40
                "
              >
                <LogOut size={16} />

                {logoutLoading
                  ? "Выходим…"
                  : "Выйти"}
              </button>
            )}

            {logoutError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                {logoutError}
              </div>
            )}
          </div>

          {/* SYNC */}

          <SyncStatusCard
            authenticated={
              Boolean(authUser)
            }
            status={syncStatus}
            error={syncError}
            lastSyncedAt={
              lastSyncedAt
            }
            onSync={onSync}
          />

          {/* LOCAL STORAGE */}

          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <Database
              size={18}
              className="mt-0.5 shrink-0 text-primary"
            />

            <div>
              <p className="mb-0.5 text-sm font-medium text-foreground">
                Локальное хранилище
              </p>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Растения и фотографии
                сохраняются локально
                в IndexedDB этого устройства.
                Резервную копию можно
                сохранить вручную.
              </p>
            </div>
          </div>

          {/* EXPORT */}

          <div className="mb-3 rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Download
                size={16}
                className="text-primary"
              />

              Сохранить резервную копию
            </p>

            <p className="mb-3 text-xs text-muted-foreground">
              Скачать резервную копию
              данных PlantCare.
            </p>

            <button
              type="button"
              onClick={() =>
                downloadBackup(
                  createBackup(
                    plants,
                    settings,
                  ),
                )
              }
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-primary
                py-3
                text-sm
                font-medium
                text-primary-foreground
              "
            >
              <Download size={16} />

              Экспортировать (
              {plants.length} растений)
            </button>
          </div>

          {/* IMPORT */}

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Upload
                size={16}
                className="text-primary"
              />

              Загрузить резервную копию
            </p>

            <p className="mb-3 text-xs text-muted-foreground">
              Импортировать ранее
              сохранённые данные PlantCare.
            </p>

            <div className="mb-3 flex gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() =>
                  setMergeMode("merge")
                }
                className={`
                  flex-1
                  rounded-lg
                  py-2
                  text-xs
                  font-medium
                  transition-all
                  ${
                    mergeMode === "merge"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }
                `}
              >
                Объединить
              </button>

              <button
                type="button"
                onClick={() =>
                  setMergeMode(
                    "replace",
                  )
                }
                className={`
                  flex-1
                  rounded-lg
                  py-2
                  text-xs
                  font-medium
                  transition-all
                  ${
                    mergeMode === "replace"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }
                `}
              >
                Заменить всё
              </button>
            </div>

            {mergeMode === "replace" && (
              <div className="mb-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <AlertTriangle
                  size={14}
                  className="mt-0.5 shrink-0 text-amber-500"
                />

                <p className="text-xs text-amber-800">
                  Текущие данные будут
                  удалены и заменены
                  данными из файла.
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                setStatus("idle");

                fileRef.current?.click();
              }}
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-border
                py-3
                text-sm
                font-medium
                text-foreground
              "
            >
              <Upload size={16} />

              Выбрать файл
            </button>

            <AnimatePresence>
              {status === "success" && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 6,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="
                    mt-3
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-emerald-200
                    bg-emerald-50
                    p-3
                  "
                >
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <p className="text-xs text-emerald-800">
                    {mergeMode === "merge"
                      ? `Добавлено ${importedCount} новых растений.`
                      : `Загружено ${importedCount} растений. Старые данные заменены.`}
                  </p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 6,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="
                    mt-3
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    p-3
                  "
                >
                  <AlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-red-500"
                  />

                  <p className="text-xs text-red-800">
                    {errorMsg}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}