import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, AlertCircle, BookOpen, Layers, History, ShieldAlert, Sparkles } from 'lucide-react';

export type ErrorType = 'server_busy' | 'quota_limit' | 'network' | 'general';

interface FriendlyErrorCardProps {
  error?: string | null;
  errorType?: ErrorType;
  retryAttempt?: number; // e.g. 2 for "Кӯшиши 2 аз 3..."
  maxRetries?: number;   // default 3
  countdownSeconds?: number; // initial countdown
  onRetry?: () => void;
  onOpenHistory?: () => void;
  onOpenCards?: () => void;
  onOpenSummaries?: () => void;
  className?: string;
}

export function detectErrorType(errorMessage?: string | null): ErrorType {
  if (!errorMessage) return 'general';
  const msg = errorMessage.toLowerCase();
  if (msg.includes('503') || msg.includes('банд') || msg.includes('unavailable') || msg.includes('high demand')) {
    return 'server_busy';
  }
  if (msg.includes('429') || msg.includes('лимит') || msg.includes('quota') || msg.includes('resource_exhausted')) {
    return 'quota_limit';
  }
  if (msg.includes('интернет') || msg.includes('network') || msg.includes('offline') || msg.includes('fetch failed')) {
    return 'network';
  }
  return 'general';
}

export const FriendlyErrorCard: React.FC<FriendlyErrorCardProps> = ({
  error,
  errorType,
  retryAttempt,
  maxRetries = 3,
  countdownSeconds = 60,
  onRetry,
  onOpenHistory,
  onOpenCards,
  onOpenSummaries,
  className = '',
}) => {
  const computedType = errorType || detectErrorType(error);
  const [secondsLeft, setSecondsLeft] = useState<number>(countdownSeconds);

  useEffect(() => {
    setSecondsLeft(countdownSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds, error]);

  const isDailyLimit = computedType === 'quota_limit';
  const isServerBusy = computedType === 'server_busy';

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 border shadow-lg transition-all animate-fade-in ${
        isDailyLimit
          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
          : 'bg-slate-50/95 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Calm Icon */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
            isDailyLimit
              ? 'bg-amber-500/20 border border-amber-400/30 text-amber-600 dark:text-amber-300'
              : 'bg-indigo-500/10 border border-indigo-400/20 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          {isDailyLimit ? (
            <ShieldAlert className="w-7 h-7" />
          ) : (
            <Clock className="w-7 h-7 animate-pulse" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-base sm:text-lg">
              {isDailyLimit
                ? 'Лимити имрӯза тамом шуд. Пагоҳ дубора кӯшиш кунед.'
                : 'Серверҳо ҳоло банданд. Лутфан 1-2 дақиқа интизор шавед.'}
            </h3>

            {retryAttempt && retryAttempt > 1 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 animate-pulse">
                Кӯшиши {retryAttempt} аз {maxRetries}...
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {isDailyLimit
              ? 'Ҳамаи расмҳо ва маълумоти шумо нигоҳ дошта шуданд. Дар ин вақт метавонед бо мавзӯъҳои пештар хондашуда ва карточкаҳо дарс тайёр кунед.'
              : 'Дархостҳои зиёд ба зеҳни сунъӣ ворид шудаанд. Расм ва навиштаи шумо ҳифз шуд, чизе гум намешавад.'}
          </p>

          {/* Countdown timer */}
          {!isDailyLimit && secondsLeft > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Вақти тавсиявии интизорӣ: {secondsLeft} сония</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-transform active:scale-95 flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Дубора кӯшиш кунед</span>
          </button>
        )}

        {/* Offline learning alternatives if daily limit or wait time */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenCards && (
            <button
              type="button"
              onClick={onOpenCards}
              className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Карточкаҳо</span>
            </button>
          )}

          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>Таърихи дарсҳо</span>
            </button>
          )}

          {onOpenSummaries && (
            <button
              type="button"
              onClick={onOpenSummaries}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Конспектҳо</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
