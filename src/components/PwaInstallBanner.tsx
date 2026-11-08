import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'ilmisino_pwa_banner_dismissed';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // 1. Detect standalone mode
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneCheck);

    // 2. Detect iOS device
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 3. Listen for Android / Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(DISMISS_KEY, 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem(DISMISS_KEY, 'true');
        } catch {}
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {}
  };

  // Do not show if already running as installed app or dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  // If neither Android prompt is ready nor is it iOS, do not show unprompted banner
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white border border-indigo-700/50 shadow-xl animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
            <Smartphone className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <h4 className="font-extrabold text-sm sm:text-base leading-snug">
              📲 Илмисиноро ба экран илова кунед
            </h4>

            {isIOS ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                Барои насб дар iPhone: тугмаи <strong className="text-white">«Мубодила» (Share)</strong> <Share className="w-3 h-3 inline pb-0.5" /> -ро пахш намуда, <strong className="text-white">«Ба экрани асосӣ» (Add to Home Screen)</strong> <PlusSquare className="w-3 h-3 inline pb-0.5" /> -ро интихоб кунед.
              </p>
            ) : (
              <p className="text-xs text-slate-300">
                Барои кушодашавии зуд ва мутолиаи дарсҳо ҳатто бе интернет (Офлайн).
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          title="Пӯшидан"
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isIOS && deferredPrompt && (
        <div className="pt-3 flex justify-end">
          <button
            onClick={handleInstallClick}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-500/30 flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Насб кардан</span>
          </button>
        </div>
      )}
    </div>
  );
};
