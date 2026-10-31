import { useEffect, useId, useRef, useState } from 'react';
import { Download, MoreHorizontal, PlusSquare, RefreshCw, Share, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { usePwaInstallation } from '../../hooks/usePwaInstallation';
import { startPwaUpdates } from '../../pwa/updates';
import { Button } from './Button';
import { Modal } from './Modal';

export function PwaSupport() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const installation = usePwaInstallation();
  const [guideOpen, setGuideOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const manager = useRef<ReturnType<typeof startPwaUpdates> | null>(null);
  const titleId = useId();
  const isAuthAction = pathname.startsWith('/auth/');

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    const lifecycle = startPwaUpdates(
      () => setUpdateAvailable(true),
      () => { setUpdating(false); setUpdateError(true); },
    );
    manager.current = lifecycle;
    return () => { lifecycle.dispose(); manager.current = null; };
  }, []);

  const applyUpdate = () => {
    if (updating) return;
    setUpdating(true);
    setUpdateError(false);
    manager.current?.applyUpdate();
  };

  return (
    <>
      {updateAvailable ? (
        <aside aria-labelledby={titleId} aria-live="polite" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-border-strong bg-surface-strong p-4 text-text shadow-xl">
          <div className="flex items-start gap-3">
            <RefreshCw aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary-strong" />
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-sm font-semibold">{t('pwa.updateTitle')}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t('pwa.updateDescription')}</p>
              {updateError ? <p role="alert" className="mt-2 text-xs text-danger">{t('pwa.updateError')}</p> : null}
              <Button className="mt-3" onClick={applyUpdate} disabled={updating}>
                {t(updating ? 'pwa.updating' : 'pwa.reload')}
              </Button>
            </div>
          </div>
        </aside>
      ) : installation.visible && !isAuthAction ? (
        <aside aria-labelledby={titleId} className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-border-strong bg-surface-strong p-4 text-text shadow-[0_8px_40px_rgba(53,58,47,0.16)]">
          <div className="flex items-start gap-3">
            <img src="/pwa/icon-192.png" alt="" width="44" height="44" className="shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-sm font-semibold">{t('pwa.installTitle')}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t('pwa.installDescription')}</p>
            </div>
            <button type="button" onClick={installation.dismiss} aria-label={t('pwa.dismiss')} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary-strong">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-[56px]">
            <Button icon={<Download />} disabled={installation.pending} onClick={() => {
              if (installation.nativePrompt) void installation.install();
              else setGuideOpen(true);
            }}>{t(installation.pending ? 'pwa.installing' : installation.nativePrompt ? 'pwa.install' : 'pwa.showInstructions')}</Button>
            <Button variant="ghost" onClick={installation.dismiss}>{t('pwa.notNow')}</Button>
          </div>
        </aside>
      ) : null}
      <Modal open={guideOpen && installation.visible && !isAuthAction} title={t('pwa.installTitle')} onClose={() => setGuideOpen(false)} className="max-w-md" footer={<Button onClick={() => setGuideOpen(false)}>{t('pwa.gotIt')}</Button>}>
        <div className="space-y-4 p-5 text-sm leading-relaxed text-text">
          <p className="text-muted">{t('pwa.guideDescription')}</p>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              {installation.ios ? <Share aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" /> : <MoreHorizontal aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" />}
              <span>{t(installation.ios ? 'pwa.iosStep1' : 'pwa.androidStep1')}</span>
            </li>
            <li className="flex items-start gap-3"><PlusSquare aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" /><span>{t(installation.ios ? 'pwa.iosStep2' : 'pwa.androidStep2')}</span></li>
          </ol>
          <p className="rounded-lg bg-bg p-3 text-xs text-muted">{t(installation.ios ? 'pwa.iosHint' : 'pwa.androidHint')}</p>
        </div>
      </Modal>
    </>
  );
}
