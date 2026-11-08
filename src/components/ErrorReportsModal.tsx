import React, { useState } from 'react';
import {
  X,
  Copy,
  CheckCircle2,
  Trash2,
  Flag,
  Share2,
  Calendar,
  Send,
  FileText,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { ErrorReport } from '../types/reports.ts';
import { getStoredReports, deleteReport, clearAllReports, updateReportStatus } from '../services/storage.ts';
import { sendReportToBackend } from '../services/api.ts';
import { shareToTelegram } from '../utils/shareUtils.ts';

interface ErrorReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ErrorReportsModal: React.FC<ErrorReportsModalProps> = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState<ErrorReport[]>(() => getStoredReports());
  const [copied, setCopied] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    const remaining = deleteReport(id);
    setReports(remaining);
  };

  const handleClearAll = () => {
    if (confirm('Ҳамаи гузоришҳои хатогиро пок мекунед?')) {
      clearAllReports();
      setReports([]);
    }
  };

  const handleRetrySingle = async (report: ErrorReport) => {
    setRetryingId(report.id);
    try {
      await sendReportToBackend(report);
      const updated = updateReportStatus(report.id, 'sent');
      setReports(updated);
    } catch (e) {
      alert('Фиристодан ноком шуд. Лутфан пайвасти интернетро тафтиш кунед.');
    } finally {
      setRetryingId(null);
    }
  };

  const handleSyncAllPending = async () => {
    const pendingReports = reports.filter((r) => r.status === 'pending');
    if (pendingReports.length === 0) return;

    setIsSyncingAll(true);
    for (const report of pendingReports) {
      try {
        await sendReportToBackend(report);
        updateReportStatus(report.id, 'sent');
      } catch (e) {
        console.warn('Sync failed for report', report.id, e);
      }
    }
    setReports(getStoredReports());
    setIsSyncingAll(false);
  };

  const formatAllReportsText = (): string => {
    if (reports.length === 0) return 'Гузориши хатогӣ нест.';
    
    let text = `📢 Ҳисоботи хатогиҳо дар Илмисино (${reports.length} адад):\n\n`;
    reports.forEach((r, idx) => {
      text += `${idx + 1}. [${r.subject} | ${r.topicTitle}]\n`;
      text += `Сана: ${r.formattedDate}\n`;
      text += `Ҳолат: ${r.status === 'sent' ? 'Фиристода шуд' : 'Интизор'}\n`;
      text += `Сабаб: ${r.reason}\n`;
      if (r.comment) text += `Шарҳи донишҷӯ: ${r.comment}\n`;
      text += `Матни хато: «${r.exactText.slice(0, 160)}${r.exactText.length > 160 ? '...' : ''}»\n\n`;
    });
    return text.trim();
  };

  const handleCopyAll = () => {
    const text = formatAllReportsText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToTelegram = () => {
    const text = formatAllReportsText();
    shareToTelegram({
      title: 'Ҳисоботи хатогиҳои Илмисино',
      text: text,
    });
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const sentCount = reports.filter((r) => r.status === 'sent').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shadow-xs">
              <Flag className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Ҳисоботи хатоҳо
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[11px]">
                  {reports.length} гузориш
                </span>
                {sentCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                    {sentCount} фиристода шуд
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                    {pendingCount} интизор
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Рӯйхати ҳамаи хатогиҳои қайдкардаи шумо дар барнома
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        {reports.length > 0 && (
          <div className="px-4 py-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyAll}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Нусха шуд!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Нусха кун</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSendToTelegram}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Фиристодан ба Telegram</span>
              </button>

              {pendingCount > 0 && (
                <button
                  onClick={handleSyncAllPending}
                  disabled={isSyncingAll}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                >
                  {isSyncingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Ирсол...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ҳамаи интизорҳоро фирист</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              onClick={handleClearAll}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Пок кардани ҳама</span>
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {reports.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                Ҳоло ягон хатогӣ сабт нашудааст
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Агар ҳангоми омӯзиш ё тест ягон нодурустиро пайдо кунед, тугмаи «🚩 Хато ёфтам»-ро пахш намоед. Гузориши шумо дар ин ҷо сабт хоҳад шуд.
              </p>
            </div>
          ) : (
            reports.map((report) => {
              const isSent = report.status === 'sent';
              const isRetrying = retryingId === report.id;

              return (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[11px]">
                        {report.reason}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {report.subject} • {report.topicTitle}
                      </span>

                      {/* Status Badge */}
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Фиристода шуд</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Интизор</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isSent && (
                        <button
                          onClick={() => handleRetrySingle(report)}
                          disabled={isRetrying}
                          title="Фиристодан"
                          className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          {isRetrying ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span>Фиристодан</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(report.id)}
                        title="Нобуд кардан"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic font-mono text-[11px] line-clamp-3">
                    «{report.exactText}»
                  </div>

                  {report.comment && (
                    <div className="text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">Шарҳ:</strong> {report.comment}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Манбаъ: {report.source}</span>
                    <span>{report.formattedDate}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
