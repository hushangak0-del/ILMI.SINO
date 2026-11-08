import React, { useState } from 'react';
import { Flag, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ErrorReport, REPORT_REASONS, ReportReason, ReportSource } from '../types/reports.ts';
import { saveReport } from '../services/storage.ts';
import { sendReportToBackend } from '../services/api.ts';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  topicTitle: string;
  exactText: string;
  source: ReportSource;
  onReportSaved?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  subject,
  topicTitle,
  exactText,
  source,
  onReportSaved,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('Ҷавоб нодуруст аст');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('Ташаккур! Хато ба барномасоз фиристода шуд 🙏');
  const [subMessage, setSubMessage] = useState<string>('Гузориши шумо ба таври худкор ба барномасоз расид.');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('tg-TJ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const report: ErrorReport = {
      id: 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      date: now.toISOString(),
      formattedDate,
      subject: subject || 'Фанни умумӣ',
      topicTitle: topicTitle || 'Мавзӯъ',
      exactText: exactText ? exactText.trim() : 'Матн сабт нашудааст',
      reason: selectedReason,
      comment: comment.trim() || undefined,
      source,
      status: 'pending',
      appVersion: '1.2.0',
    };

    try {
      await sendReportToBackend(report);
      report.status = 'sent';
      saveReport(report);
      setSuccessMessage('Ташаккур! Хато ба барномасоз фиристода шуд 🙏');
      setSubMessage('Гузориши шумо бомуваффақият қабул шуд.');
    } catch (err) {
      console.warn('Backend report delivery queued locally:', err);
      report.status = 'pending';
      saveReport(report);
      setSuccessMessage('Ташаккур! Хато қайд карда шуд 🙏');
      setSubMessage('Хато дар ҳолати интизор сабт шуд ва ҳангоми фаъол будани интернет худкор фиристода мешавад.');
    } finally {
      setIsSubmitting(false);
      setIsSuccess(true);
      if (onReportSaved) {
        onReportSaved();
      }

      setTimeout(() => {
        setIsSuccess(false);
        setComment('');
        setSelectedReason('Ҷавоб нодуруст аст');
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto p-5 sm:p-6 space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Flag className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Гузориши хатогӣ
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ба беҳтар кардани ҷавобҳои Илмисино кӯмак кунед
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
              {successMessage}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {subMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Context snippet preview */}
            {exactText && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Матни қайдшуда:
                </span>
                <p className="line-clamp-2 italic text-slate-700 dark:text-slate-300">
                  «{exactText.trim()}»
                </p>
              </div>
            )}

            {/* Quick Reasons Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Сабаби хатогӣ:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REPORT_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setSelectedReason(reason)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Чӣ хато аст? <span className="text-slate-400 font-normal">(ихтиёрӣ)</span>:
              </label>
              <textarea
                rows={2}
                disabled={isSubmitting}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Масалан: Дар формула аломати ҷамъ бояд тарҳ бошад..."
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Бекор
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-500/25 transition-transform active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Фиристода истодааст...</span>
                  </>
                ) : (
                  <span>Фиристодан</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
