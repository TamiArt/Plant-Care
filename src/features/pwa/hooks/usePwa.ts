import { useCallback, useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
}

const INSTALL_HIDDEN_KEY = "plantcare-install-hidden";

export function usePwa() {
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const [offlineReady, setOfflineReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();

      const isHidden =
        localStorage.getItem(INSTALL_HIDDEN_KEY) === "true";

      /*
       * Пользователь уже закрыл предложение установки.
       * Событие перехватываем, но баннер больше не показываем.
       */
      if (isHidden) {
        setInstallPrompt(null);
        return;
      }

      setInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      localStorage.setItem(INSTALL_HIDDEN_KEY, "true");
      setInstallPrompt(null);
    };

    const onOnline = () => {
      setIsOnline(true);
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      onInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      onInstalled
    );

    window.addEventListener(
      "online",
      onOnline
    );

    window.addEventListener(
      "offline",
      onOffline
    );

    if (
      "serviceWorker" in navigator &&
      import.meta.env.PROD
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((nextRegistration) => {
          setRegistration(nextRegistration);

          if (nextRegistration.waiting) {
            setUpdateAvailable(true);
          }

          const watchWorker = (
            worker: ServiceWorker | null
          ) => {
            if (!worker) return;

            worker.addEventListener(
              "statechange",
              () => {
                if (worker.state !== "installed") {
                  return;
                }

                if (navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                } else {
                  setOfflineReady(true);
                }
              }
            );
          };

          watchWorker(nextRegistration.installing);

          nextRegistration.addEventListener(
            "updatefound",
            () => {
              watchWorker(nextRegistration.installing);
            }
          );
        })
        .catch((error) => {
          console.warn(
            "Service worker registration failed",
            error
          );
        });
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        onInstalled
      );

      window.removeEventListener(
        "online",
        onOnline
      );

      window.removeEventListener(
        "offline",
        onOffline
      );
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();

      const result =
        await installPrompt.userChoice;

      if (result.outcome === "accepted") {
        localStorage.setItem(
          INSTALL_HIDDEN_KEY,
          "true"
        );
      }
    } finally {
      /*
       * Событие beforeinstallprompt можно использовать
       * только один раз.
       */
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const closeInstall = useCallback(() => {
    localStorage.setItem(
      INSTALL_HIDDEN_KEY,
      "true"
    );

    setInstallPrompt(null);
  }, []);

  const applyUpdate = useCallback(() => {
    const waitingWorker = registration?.waiting;

    if (!waitingWorker) {
      void registration?.update();
      return;
    }

    let reloaded = false;

    const onControllerChange = () => {
      if (reloaded) return;

      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
      { once: true }
    );

    waitingWorker.postMessage({
      type: "SKIP_WAITING",
    });
  }, [registration]);

  return {
    canInstall: Boolean(installPrompt),
    install,
    closeInstall,
    isOnline,
    offlineReady,
    updateAvailable,
    applyUpdate,
  };
}