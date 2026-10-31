const UPDATE_INTERVAL_MS = 30 * 60 * 1000;
let registrationPromise: Promise<ServiceWorkerRegistration> | undefined;

function registerWorker() {
  registrationPromise ??= navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  }).catch((error: unknown) => {
    registrationPromise = undefined;
    throw error;
  });
  return registrationPromise;
}

export function startPwaUpdates(onUpdate: () => void, onError: () => void) {
  let disposed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let checking = false;
  let applying = false;
  let reloaded = false;
  let activationTimeout: number | undefined;
  let controller = navigator.serviceWorker.controller;
  const workers = new Set<ServiceWorker>();

  const reload = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };
  const check = () => {
    if (!registration || disposed || checking || !navigator.onLine) return;
    checking = true;
    void registration.update().catch(() => {
      // A transient network failure can be retried on visibility/reconnect.
    }).finally(() => { checking = false; });
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };
  const onControllerChange = () => {
    const nextController = navigator.serviceWorker.controller;
    if (controller === nextController) return;
    if (applying) reload();
    else if (controller) onUpdate(); // Other tabs keep their work until they reload.
    controller = nextController;
  };
  const onWorkerStateChange = () => {
    if (registration?.waiting && registration.active) onUpdate();
  };
  const onUpdateFound = () => {
    const worker = registration?.installing;
    if (!worker || workers.has(worker)) return;
    workers.add(worker);
    worker.addEventListener('statechange', onWorkerStateChange);
  };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', check);
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  const interval = window.setInterval(() => {
    if (document.visibilityState === 'visible') check();
  }, UPDATE_INTERVAL_MS);

  void registerWorker().then((nextRegistration) => {
    if (disposed) return;
    registration = nextRegistration;
    registration.addEventListener('updatefound', onUpdateFound);
    onUpdateFound();
    if (registration.waiting && registration.active) onUpdate();
    check();
  }).catch((error: unknown) => {
    if (!disposed) console.warn('ChronoSync app installation support could not start.', error);
  });

  return {
    applyUpdate() {
      if (applying || disposed) return;
      if (!registration?.waiting) { reload(); return; }
      applying = true;
      try {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        activationTimeout = window.setTimeout(() => {
          applying = false;
          onError();
        }, 15_000);
      } catch {
        applying = false;
        onError();
      }
    },
    dispose() {
      disposed = true;
      window.clearInterval(interval);
      window.clearTimeout(activationTimeout);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      registration?.removeEventListener('updatefound', onUpdateFound);
      for (const worker of workers) worker.removeEventListener('statechange', onWorkerStateChange);
    },
  };
}
