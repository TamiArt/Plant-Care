import { useCallback, useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwa() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(nextRegistration => {
        setRegistration(nextRegistration);
        if (nextRegistration.waiting) setUpdateAvailable(true);
        const watch = (worker: ServiceWorker | null) => worker?.addEventListener("statechange", () => {
          if (worker.state !== "installed") return;
          if (navigator.serviceWorker.controller) setUpdateAvailable(true);
          else setOfflineReady(true);
        });
        watch(nextRegistration.installing);
        nextRegistration.addEventListener("updatefound", () => watch(nextRegistration.installing));
      }).catch((error) => console.warn("Service worker registration failed", error));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  const applyUpdate = useCallback(() => {
    const waiting = registration?.waiting;
    if (!waiting) {
      void registration?.update();
      return;
    }
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloaded) { reloaded = true; window.location.reload(); }
    });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, [registration]);

  return { canInstall: Boolean(installPrompt), install, isOnline, offlineReady, updateAvailable, applyUpdate };
}
