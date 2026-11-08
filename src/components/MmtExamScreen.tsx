import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Award,
  Sparkles,
  HelpCircle,
  XCircle,
  Layers,
  FileText,
  Loader2,
  Flag,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { ExamQuestion, ExamResult } from '../types/features.ts';
import { TopicRecord } from '../types/index.ts';
import { SUBJECTS } from '../utils/studyLogic.ts';
import { calculateExamResult, formatSecondsToTime } from '../utils/examLogic.ts';
import { requestExamBatch } from '../services/api.ts';
import { saveStoredExamResult, isTextReported } from '../services/storage.ts';
import { shareToTelegram } from '../utils/shareUtils.ts';
import { ReportModal } from './ReportModal.tsx';
import { AiDisclaimerNotice } from './AiDisclaimerNotice.tsx';
import { FriendlyErrorCard } from './FriendlyErrorCard.tsx';

interface MmtExamScreenProps {
  topics: TopicRecord[];
  onExamSaved: (result: ExamResult) => void;
}

export const MmtExamScreen: React.FC<MmtExamScreenProps> = ({ topics, onExamSaved }) => {
  // Setup state
  const [examState, setExamState] = useState<'setup' | 'loading' | 'active' | 'result'>('setup');
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Химия',
    'Биология',
    'Физика',
    'Забони тоҷикӣ',
  ]);
  const [timerMinutes, setTimerMinutes] = useState<number>(30);
  const [reportingQuestion, setReportingQuestion] = useState<ExamQuestion | null>(null);

  // Active exam state
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 3,
  });
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showConfirmFinish, setShowConfirmFinish] = useState<boolean>(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // Toggle subject selection
  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  // Start Exam: fetch batches of 10 questions
  const handleStartExam = async () => {
    setExamState('loading');
    setLoadingError(null);
    const batchesCount = Math.ceil(questionCount / 10);
    setLoadingProgress({ current: 0, total: batchesCount });

    const allGenerated: ExamQuestion[] = [];
    const topicExcerpts = topics.map((t) => `${t.title} (${t.option}): ${t.cleanText.slice(0, 300)}`);

    try {
      for (let i = 0; i < batchesCount; i++) {
        const batchRes = await requestExamBatch({
          subjects: selectedSubjects,
          count: 10,
          batchIndex: i,
          topicExcerpts,
        });

        if (Array.isArray(batchRes.questions)) {
          batchRes.questions.forEach((q: any, idx: number) => {
            allGenerated.push({
              id: `exam_q_${i}_${idx}_${Date.now()}`,
              subjectId: 'chemistry',
              subjectName: q.subjectName || selectedSubjects[i % selectedSubjects.length],
              question: q.question,
              options: q.options,
              correct: q.correct,
              explanation: q.explanation,
            });
          });
        }
        setLoadingProgress({ current: i + 1, total: batchesCount });
      }

      if (allGenerated.length === 0) {
        throw new Error('Саволҳои имтиҳон омода нашуданд. Лутфан дубора санҷед.');
      }

      setQuestions(allGenerated);
      setCurrentIdx(0);
      const totalSecs = timerMinutes * 60;
      setSecondsRemaining(totalSecs);
      setTimeSpentSeconds(0);
      setExamState('active');
    } catch (err: any) {
      setLoadingError(err.message || 'Хатогӣ рух дод.');
      setExamState('setup');
    }
  };

  // Timer countdown
  useEffect(() => {
    if (examState !== 'active') return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinishExam(true);
          return 0;
        }
        return prev - 1;
      });
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [examState, questions]);

  // Answer question
  const handleAnswer = (ans: 'A' | 'B' | 'C' | 'D') => {
    const updated = [...questions];
    updated[currentIdx].userAnswer = ans;
    setQuestions(updated);
  };

  // Flag/unflag question
  const toggleFlag = (idx: number) => {
    const updated = [...questions];
    updated[idx].isFlagged = !updated[idx].isFlagged;
    setQuestions(updated);
  };

  // Finish exam
  const handleFinishExam = (isAuto = false) => {
    clearInterval(timerRef.current);
    const result = calculateExamResult(questions, timeSpentSeconds);
    setExamResult(result);
    onExamSaved(result);
    saveStoredExamResult(result);
    setExamState('result');

    if (result.percentage >= 70) {
      try {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  const answeredCount = questions.filter((q) => !!q.userAnswer).length;

  return (
    <div className="space-y-5 pb-24 max-w-4xl mx-auto">
      {/* 1. SETUP VIEW */}
      {examState === 'setup' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Имтиҳони тақлидии ММТ</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                Шароити воқеӣ
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Худро дар вазъияти имтиҳони расмӣ санҷед: таймер, ҷадвали саволҳо ва холҳои дақиқ
            </p>
          </div>

          {loadingError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loadingError}</span>
            </div>
          )}

          {/* Number of Questions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Шумораи саволҳо
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[30, 60, 90].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setQuestionCount(num);
                    setTimerMinutes(num); // 1 min per question default
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    questionCount === num
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-extrabold ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-lg font-black">{num}</div>
                  <div className="text-[10px] text-slate-500">савол ({num} дақиқа)</div>
                </button>
              ))}
            </div>
          </div>

          {/* Select Subjects */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Фанҳои имтиҳон (Интихоб кунед)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {['Химия', 'Биология', 'Физика', 'Забони тоҷикӣ'].map((sub) => {
                const isSelected = selectedSubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{sub}</span>
                    <span className="text-xs">{isSelected ? '✅' : '⚪'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timer Customization */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Вақти ҷудошуда
              </label>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {timerMinutes} дақиқа
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>10 дақиқа</span>
              <span>1 соат</span>
              <span>2 соат</span>
            </div>
          </div>

          {/* Big Start Button */}
          <button
            onClick={handleStartExam}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Оғози имтиҳон ({questionCount} савол)</span>
          </button>
        </div>
      )}

      {/* 2. LOADING SCREEN */}
      {examState === 'loading' && (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-md max-w-md mx-auto my-12 animate-pulse">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
              Саволҳои имтиҳони ММТ омода мешаванд...
            </h3>
            <p className="text-xs text-slate-500">
              Дастаи {loadingProgress.current} аз {loadingProgress.total} омода шуд
            </p>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${Math.max(10, (loadingProgress.current / loadingProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 3. ACTIVE EXAM VIEW */}
      {examState === 'active' && questions.length > 0 && (
        <div className="space-y-4">
          {/* Top Timer & Action Header */}
          <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
            {/* Timer countdown */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border ${
              secondsRemaining < 300
                ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}>
              <Clock className="w-4 h-4 stroke-[2.5]" />
              <span>{formatSecondsToTime(secondsRemaining)}</span>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Ҷавоб: {answeredCount} / {questions.length}
            </div>

            <button
              onClick={() => setShowConfirmFinish(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-transform active:scale-95"
            >
              Анҷоми тест
            </button>
          </div>

          {/* Question Grid Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {questions.map((q, idx) => {
              const isAnswered = !!q.userAnswer;
              const isFlagged = q.isFlagged;
              const isCurrent = currentIdx === idx;

              let btnStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
              if (isCurrent) {
                btnStyle = 'ring-2 ring-emerald-500 font-black bg-white dark:bg-slate-900 text-emerald-600';
              } else if (isFlagged) {
                btnStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold';
              } else if (isAnswered) {
                btnStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold';
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-8 h-8 rounded-xl text-xs flex items-center justify-center shrink-0 transition-all ${btnStyle}`}
                >
                  {isFlagged ? '⭐' : idx + 1}
                </button>
              );
            })}
          </div>

          {/* Current Question View */}
          {(() => {
            const q = questions[currentIdx];
            const isFlagged = q.isFlagged;

            return (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {q.subjectName} • Саволи #{currentIdx + 1}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReportingQuestion(q)}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title="Хато ёфтам"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Хато ёфтам</span>
                    </button>

                    <button
                      onClick={() => toggleFlag(currentIdx)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                        isFlagged
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'border border-slate-200 text-slate-500 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                      <span>{isFlagged ? 'Нишон шуд' : 'Нишон кун ⭐'}</span>
                    </button>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {q.question}
                </h3>

                {/* Options A, B, C, D (No instant feedback!) */}
                <div className="grid grid-cols-1 gap-2.5">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const optText = q.options[opt];
                    const isSelected = q.userAnswer === opt;

                    return (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(opt)}
                        className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-extrabold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {opt}
                        </span>
                        <span className="leading-snug">{optText}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Қаблӣ</span>
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1 transition-transform active:scale-95"
                    >
                      <span>Баъдӣ</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConfirmFinish(true)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                    >
                      Анҷоми имтиҳон
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Confirm Finish Modal */}
          {showConfirmFinish && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4 text-center shadow-xl">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Оё мехоҳед имтиҳонро анҷом диҳед?
                </h4>
                <p className="text-xs text-slate-500">
                  Шумо ба {answeredCount} аз {questions.length} савол ҷавоб додед. {questions.length - answeredCount} савол бе ҷавоб мондааст.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowConfirmFinish(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    Идома додан
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmFinish(false);
                      handleFinishExam(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md"
                  >
                    Бале, анҷом деҳ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RESULT VIEW */}
      {examState === 'result' && examResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Score Summary Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-teal-950 text-white text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Award className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Натиҷаи расмии тақлидӣ
              </span>
              <h2 className="text-3xl sm:text-4xl font-black pt-1">
                {examResult.correctCount} / {examResult.totalQuestions} ({examResult.percentage}%)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Вақти сарфшуда: {formatSecondsToTime(examResult.timeSpentSeconds)}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setExamState('setup')}
                className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
              >
                Имтиҳони нав
              </button>

              <button
                onClick={() => {
                  const text = `🏆 Натиҷаи расмии имтиҳони тақлидии ММТ дар «Илмисино»:\n\n` +
                    `📊 Хол: ${examResult.correctCount}/${examResult.totalQuestions} (${examResult.percentage}%)\n` +
                    `⏱ Вақти сарфшуда: ${formatSecondsToTime(examResult.timeSpentSeconds)}\n\n` +
                    `Тақсимот аз рӯи фанҳо:\n` +
                    Object.entries(examResult.subjectScores)
                      .map(([sub, data]) => `• ${sub}: ${data.correct}/${data.total} (${data.percentage}%)`)
                      .join('\n') +
                    `\n\nБо «Илмисино» - ёрдамчии ҳушманди ММТ тайёр шавед!`;
                  shareToTelegram({
                    title: 'Натиҷаи имтиҳони тақлидии ММТ',
                    text,
                  });
                }}
                className="px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>✈️ Ба Telegram фиристодан</span>
              </button>
            </div>

            {/* AI exam result disclaimer notice */}
            <AiDisclaimerNotice
              variant="examResult"
              className="border-white/10 text-slate-300 dark:text-slate-400 justify-center"
            />
          </div>

          {/* Scores per subject breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Холҳо аз рӯи фанҳо
            </h3>
            <div className="space-y-3">
              {Object.entries(examResult.subjectScores).map(([sub, data]) => (
                <div key={sub} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{sub} ({data.correct}/{data.total})</span>
                    <span>{data.percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.max(4, data.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Question Review */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Таҳлили ҳамаи саволҳо ва шарҳи дурустӣ</span>
            </h3>

            <div className="space-y-3">
              {examResult.questions.map((q, idx) => {
                const isCorrect = q.userAnswer === q.correct;
                const isReported = isTextReported(q.question);

                return (
                  <div
                    key={q.id}
                    className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-3 ${
                      isCorrect
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {idx + 1}. {q.question}
                      </span>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </div>

                    {isReported && (
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5 fill-amber-500 shrink-0" />
                        <span>Шумо дар ин савол хато қайд карда будед.</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-semibold">
                          Ҷавоби шумо: {q.userAnswer ? `${q.userAnswer}) ${q.options[q.userAnswer]}` : 'Бе ҷавоб'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold">
                          Ҷавоби дуруст: {q.correct}) {q.options[q.correct]}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setReportingQuestion(q)}
                        className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Flag className="w-3 h-3 text-amber-500" />
                        <span>Хато ёфтам</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                      <div>💡 <strong>Шарҳи Илмисино:</strong> {q.explanation}</div>
                      <AiDisclaimerNotice
                        variant="short"
                        speakableText={q.explanation}
                        onReport={() => setReportingQuestion(q)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingQuestion && (
        <ReportModal
          isOpen={!!reportingQuestion}
          onClose={() => setReportingQuestion(null)}
          subject={reportingQuestion.subjectName}
          topicTitle="Саволи имтиҳони ММТ"
          exactText={`${reportingQuestion.question}\n\nВариантҳо:\nA) ${reportingQuestion.options.A}\nB) ${reportingQuestion.options.B}\nC) ${reportingQuestion.options.C}\nD) ${reportingQuestion.options.D}\n\nҶавоби дуруст: ${reportingQuestion.correct}\nШарҳ: ${reportingQuestion.explanation}`}
          source="quiz"
        />
      )}
    </div>
  );
};
