import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'chronosync:pwa-install-dismissed:v1';
const DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function wasDismissed() {
  try { return Number(localStorage.getItem(DISMISSED_KEY)) > Date.now(); }
  catch { return false; }
}

export function usePwaInstallation() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [pending, setPending] = useState(false);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobile = ios || /Android|Mobile/.test(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Preserve the browser's own installation UI on desktop.
      if (!mobile || isStandalone()) return;
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    const onDisplayChange = () => setInstalled(isStandalone());
    const displayMode = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener('change', onDisplayChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener('change', onDisplayChange);
    };
  }, [mobile]);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISSAL_MS)); }
    catch { /* The recommendation still dismisses when storage is blocked. */ }
  };
  const install = async () => {
    if (!prompt || pending) return;
    setPending(true);
    setPrompt(null); // The browser event is single-use, even if dismissed.
    try {
      const choice = await prompt.prompt();
      if (choice.outcome === 'accepted') setInstalled(true);
      else dismiss();
    } catch {
      // A manual installation guide remains available if the native prompt fails.
    } finally { setPending(false); }
  };

  return {
    visible: mobile && window.isSecureContext && !installed && !dismissed,
    nativePrompt: prompt !== null,
    ios,
    pending,
    install,
    dismiss,
  };
}
