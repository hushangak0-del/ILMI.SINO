import React, { useState, useEffect } from 'react';
import { GraduationCap, Flame, Moon, Sun, Cpu } from 'lucide-react';
import { AppSettings } from '../types/index.ts';
import { requestSystemStatus } from '../services/api.ts';

interface NavbarProps {
  streakDays: number;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  streakDays,
  settings,
  onUpdateSettings,
  onOpenSettings,
}) => {
  const [activeModel, setActiveModel] = useState<string>('gemini-3.8-flash');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Check system status on mount
    requestSystemStatus()
      .then((data) => {
        if (data.activeModel) setActiveModel(data.activeModel);
        setIsOnline(data.status === 'ok');
      })
      .catch(() => setIsOnline(false));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: next });
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <GraduationCap className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-indigo-600 dark:from-emerald-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Илмисино
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                ММТ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Ёрдамчии ҳушманди дарс
            </p>
          </div>
        </div>

        {/* Right side widgets */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Model & Health Status Badge */}
          <button
            onClick={onOpenSettings}
            title={`Модели фаъол: ${activeModel}. Барои санҷиш пахш кунед.`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium hover:border-emerald-400 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Cpu className="w-3 h-3 hidden sm:inline text-slate-500" />
            <span className="font-mono text-[10px] sm:text-[11px]">
              {activeModel.replace('gemini-', '')}
            </span>
          </button>

          {/* Streak badge */}
          <div
            title="Рӯзҳои пай дар пайи омӯзиш"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 font-bold text-xs shadow-xs"
          >
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{streakDays} рӯз</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Иваз кардани намуди зоҳирӣ"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
