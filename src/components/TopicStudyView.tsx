import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  FileText,
  CheckSquare,
  Copy,
  Printer,
  Sparkles,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Award,
  ChevronRight,
  ChevronLeft,
  Layers,
} from 'lucide-react';
import { Question, SubjectId, TestAttempt, TopicRecord } from '../types/index.ts';
import { Flashcard } from '../types/features.ts';
import { SUBJECTS, calculateQuizScore, getScoreFeedback } from '../utils/studyLogic.ts';
import { requestExplanation, requestQuiz, requestSummary, requestFlashcards } from '../services/api.ts';
import { saveTopic, upsertFlashcards } from '../services/storage.ts';
import { MarkdownView } from './MarkdownView.tsx';

interface TopicStudyViewProps {
  topic: TopicRecord;
  onBack: () => void;
  onOpenChat: () => void;
  onUpdateTopic: (updated: TopicRecord) => void;
  onGoToCards?: () => void;
  defaultQuizDisplayMode?: 'single' | 'all';
}

type TabType = 'read' | 'explain' | 'summary' | 'quiz';

export const TopicStudyView: React.FC<TopicStudyViewProps> = ({
  topic,
  onBack,
  onOpenChat,
  onUpdateTopic,
  onGoToCards,
  defaultQuizDisplayMode = 'single',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('read');
  const subject = SUBJECTS[topic.subjectId];

  // Tab 2: Explain state
  const [explanation, setExplanation] = useState<string>(topic.explanation || '');
  const [isLoadingExplain, setIsLoadingExplain] = useState<boolean>(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Tab 3: Summary state
  const [summary, setSummary] = useState<string>(topic.summary || '');
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Tab 4: Quiz state
  const [questions, setQuestions] = useState<Question[]>(topic.quiz || []);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<'single' | 'all'>(defaultQuizDisplayMode);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGeneratingCards, setIsGeneratingCards] = useState<boolean>(false);
  const [cardsCreatedCount, setCardsCreatedCount] = useState<number | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateCards = async () => {
    setIsGeneratingCards(true);
    try {
      const res = await requestFlashcards({
        title: topic.title,
        text: topic.cleanText,
        subject: subject.name,
      });

      if (Array.isArray(res.cards) && res.cards.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const newFlashcards: Flashcard[] = res.cards.map((c: any, idx: number) => ({
          id: `card_${topic.id}_${idx}_${Date.now().toString(36)}`,
          topicId: topic.id,
          subjectId: topic.subjectId,
          term: c.term || 'Истилоҳ',
          question: c.question || '',
          answer: c.answer || '',
          imagePrompt: c.imagePrompt || '',
          hint: c.hint || '',
          repetitions: 0,
          intervalDays: 0,
          nextReviewDate: today,
          status: 'new',
        }));

        upsertFlashcards(newFlashcards);
        setCardsCreatedCount(newFlashcards.length);
        if (onGoToCards) {
          setTimeout(() => {
            onGoToCards();
          }, 1500);
        }
      }
    } catch (e: any) {
      alert(e.message || 'Хатогӣ ҳангоми сохтани карточкаҳо.');
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // Lazy load Tab 2: Explanation
  const loadExplanation = async (mode: 'default' | 'simpler' | 'another_example' | 'more_detailed' = 'default') => {
    setIsLoadingExplain(true);
    setExplainError(null);
    try {
      const res = await requestExplanation({
        title: topic.title,
        text: topic.cleanText,
        subject: subject.name,
        mode: mode,
      });
      setExplanation(res.explanation);
      const updated = { ...topic, explanation: res.explanation };
      onUpdateTopic(updated);
      saveTopic(updated);
    } catch (err: any) {
      setExplainError(err.message || 'Хатогӣ ҳангоми омодасозии шарҳ рух дод.');
    } finally {
      setIsLoadingExplain(false);
    }
  };

  // Lazy load Tab 3: Summary
  const loadSummary = async () => {
    if (summary) return;
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await requestSummary({
        title: topic.title,
        text: topic.cleanText,
        subject: subject.name,
      });
      setSummary(res.summary);
      const updated = { ...topic, summary: res.summary };
      onUpdateTopic(updated);
      saveTopic(updated);
    } catch (err: any) {
      setSummaryError(err.message || 'Хатогӣ ҳангоми омодасозии конспект рух дод.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Lazy load Tab 4: Quiz
  const loadQuiz = async (forceNew = false) => {
    if (!forceNew && questions.length > 0) return;
    setIsLoadingQuiz(true);
    setQuizError(null);
    setUserAnswers({});
    setCurrentQIndex(0);
    setIsQuizCompleted(false);

    try {
      const res = await requestQuiz({
        title: topic.title,
        text: topic.cleanText,
        subject: subject.name,
        seed: Date.now(),
      });
      setQuestions(res.questions);
      const updated = { ...topic, quiz: res.questions };
      onUpdateTopic(updated);
      saveTopic(updated);
    } catch (err: any) {
      setQuizError(err.message || 'Хатогӣ ҳангоми омодасозии тест рух дод.');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Trigger lazy loading when switching tabs
  useEffect(() => {
    if (activeTab === 'explain' && !explanation && !isLoadingExplain) {
      loadExplanation('default');
    } else if (activeTab === 'summary' && !summary && !isLoadingSummary) {
      loadSummary();
    } else if (activeTab === 'quiz' && questions.length === 0 && !isLoadingQuiz) {
      loadQuiz();
    }
  }, [activeTab]);

  // Handle quiz option selection
  const handleSelectOption = (qIdx: number, opt: 'A' | 'B' | 'C' | 'D') => {
    if (userAnswers[qIdx]) return; // Answered already
    const nextAnswers = { ...userAnswers, [qIdx]: opt };
    setUserAnswers(nextAnswers);

    // If all 10 questions answered, finish quiz!
    if (Object.keys(nextAnswers).length === questions.length) {
      finishQuiz(nextAnswers);
    }
  };

  const finishQuiz = (answers: Record<number, 'A' | 'B' | 'C' | 'D'>) => {
    setIsQuizCompleted(true);
    const { score, total, percentage } = calculateQuizScore(questions, answers);

    // Trigger celebratory confetti if score >= 70%
    if (percentage >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore in non-browser environments
      }
    }

    const attempt: TestAttempt = {
      id: 'att_' + Date.now().toString(36),
      date: new Date().toISOString(),
      score,
      total,
      percentage,
      userAnswers: answers,
    };

    const updatedAttempts = [attempt, ...(topic.testAttempts || [])];
    const updated = { ...topic, testAttempts: updatedAttempts };
    onUpdateTopic(updated);
    saveTopic(updated);
  };

  const printConspectus = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Ба қафо</span>
        </button>

        <div className="text-center overflow-hidden flex-1 px-2">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold mb-0.5">
            <span className={subject.accentColor}>{subject.name}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
              {topic.option}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
            {topic.title}
          </h1>
        </div>

        <button
          onClick={onOpenChat}
          className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-transform active:scale-95 shrink-0"
        >
          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Савол дорам</span>
        </button>
      </div>

      {/* Quick Action Bar: Flashcards */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleGenerateCards}
          disabled={isGeneratingCards}
          className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-extrabold text-xs shadow-md shadow-purple-600/25 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {isGeneratingCards ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Илмисино 10-15 карточка таҳия мекунад...</span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4" />
              <span>🃏 Карточкаҳо сохтан</span>
            </>
          )}
        </button>

        {cardsCreatedCount !== null && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 animate-fade-in shrink-0">
            ✅ {cardsCreatedCount} корт сохта шуд!
          </span>
        )}
      </div>

      {/* 4 Tabs Segmented Control */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl">
        <button
          onClick={() => setActiveTab('read')}
          className={`py-2.5 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'read'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Хон</span>
        </button>

        <button
          onClick={() => setActiveTab('explain')}
          className={`py-2.5 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'explain'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Фаҳмон</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`py-2.5 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'summary'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Бинавис</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`py-2.5 px-1 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'quiz'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4 shrink-0" />
          <span>Тест</span>
        </button>
      </div>

      {/* TAB 1: ХОН (READ) */}
      {activeTab === 'read' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Матни китоби дарсӣ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Матни комил бо формулаҳо ва фаслҳо
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(topic.cleanText, 'read')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'read' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Нусха шуд!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Нусхабардорӣ</span>
                </>
              )}
            </button>
          </div>

          <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
            <MarkdownView content={topic.cleanText} />
          </div>
        </div>
      )}

      {/* TAB 2: ФАҲМОН (EXPLAIN) */}
      {activeTab === 'explain' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Шарҳи сода барои мактаббача</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  Бо мисолҳои рӯзгор
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Барои хонандагони 14-сола бо мисолҳои деҳа, нон, об ва табиати кишвар
              </p>
            </div>
          </div>

          {isLoadingExplain ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Илмисино шарҳи сода ва мисолҳоро омода мекунад...
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Ин ба шумо кӯмак мекунад, ки моҳияти дарсро дар як дақиқа бифаҳмед.
              </p>
            </div>
          ) : explainError ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>{explainError}</span>
              </div>
              <button
                onClick={() => loadExplanation('default')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                Дубора кӯшиш кунед
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownView content={explanation} />
              </div>

              {/* Action Buttons at bottom of Tab 2 */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Саволҳои иловагӣ ба Илмисино:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => loadExplanation('simpler')}
                    disabled={isLoadingExplain}
                    className="px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Боз содатар фаҳмон</span>
                  </button>

                  <button
                    onClick={() => loadExplanation('another_example')}
                    disabled={isLoadingExplain}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Мисоли дигар</span>
                  </button>

                  <button
                    onClick={() => loadExplanation('more_detailed')}
                    disabled={isLoadingExplain}
                    className="px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-bold transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Муфассалтар</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: БИНАВИС (SUMMARY / CONSPECTUS) */}
      {activeTab === 'summary' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 no-print">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Конспекти дафтар</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                  Мухтасар & Тоза
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Сарлавҳа, 10 нуктаи калидӣ, таърифҳо, формулаҳо ва ҷадвал
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(summary, 'summary')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {copiedKey === 'summary' ? (
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
                onClick={printConspectus}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Чоп кун</span>
              </button>
            </div>
          </div>

          {isLoadingSummary ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Илмисино конспекти дафтарро менависад...
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Таърифҳои муҳим ва формулаҳо ҷудо карда мешаванд.
              </p>
            </div>
          ) : summaryError ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>{summaryError}</span>
              </div>
              <button
                onClick={loadSummary}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                Дубора кӯшиш кунед
              </button>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 font-mono text-xs sm:text-sm">
              <MarkdownView content={summary} />
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ТЕСТ (10 MCQS) */}
      {activeTab === 'quiz' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          {/* Quiz Top bar & Mode switch */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>10 Саволи тестӣ (Сабки ММТ)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  Чорҷавоба A, B, C, D
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Сатҳи омехта: сабук, миёна ва душвор
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuizMode(quizMode === 'single' ? 'all' : 'single')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {quizMode === 'single' ? 'Ҳама якбора' : 'Яктоӣ'}
              </button>

              <button
                onClick={() => loadQuiz(true)}
                disabled={isLoadingQuiz}
                title="Омода кардани 10 саволи нав"
                className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoadingQuiz ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Тести нав</span>
              </button>
            </div>
          </div>

          {isLoadingQuiz ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Илмисино 10 саволи сабки ММТ-ро таҳия мекунад...
              </p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Саволҳо бар асоси ҳамин мавзӯъ ва дараҷаҳои гуногуни имтиҳонӣ тартиб дода мешаванд.
              </p>
            </div>
          ) : quizError ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>{quizError}</span>
              </div>
              <button
                onClick={() => loadQuiz(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                Дубора кӯшиш кунед
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-slate-500">Барои ин мавзӯъ тести нав омода кунед.</p>
              <button
                onClick={() => loadQuiz(true)}
                className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold"
              >
                Оғози тест
              </button>
            </div>
          ) : isQuizCompleted ? (
            /* Quiz Score Summary Screen */
            <div className="space-y-6 animate-fade-in">
              {(() => {
                const { score, total, percentage, mistakes } = calculateQuizScore(questions, userAnswers);
                const feedback = getScoreFeedback(percentage);

                return (
                  <>
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-3xl bg-white dark:bg-slate-700 shadow-md flex items-center justify-center">
                        <Award className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${feedback.badgeColor}`}>
                          {feedback.title}
                        </span>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                          Натиҷа: {score} / {total} ({percentage}%)
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto pt-1 leading-relaxed">
                          {feedback.message}
                        </p>
                      </div>

                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          onClick={() => {
                            setUserAnswers({});
                            setCurrentQIndex(0);
                            setIsQuizCompleted(false);
                          }}
                          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Аз нав санҷед
                        </button>
                        <button
                          onClick={() => loadQuiz(true)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-transform active:scale-95"
                        >
                          10 Саволи дигар (Бе маҳдудият)
                        </button>
                      </div>
                    </div>

                    {/* Mistakes breakdown */}
                    {mistakes.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-500" />
                          <span>Хатогиҳо ва шарҳи онҳо ({mistakes.length}):</span>
                        </h4>

                        <div className="space-y-3">
                          {mistakes.map((m) => (
                            <div
                              key={m.index}
                              className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2 text-xs"
                            >
                              <div className="font-bold text-slate-900 dark:text-white">
                                {m.index + 1}. {m.question.question}
                              </div>
                              <div className="flex flex-wrap gap-2 text-[11px]">
                                <span className="px-2 py-0.5 rounded-md bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-semibold">
                                  Ҷавоби шумо: {m.chosen}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold">
                                  Ҷавоби дуруст: {m.question.correct}) {m.question.options[m.question.correct]}
                                </span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-400 italic bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950">
                                💡 {m.question.explanation}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs text-center font-bold">
                        🎉 Ҳамаи 10 савол бе ягон хато ҷавоб дода шуд!
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : quizMode === 'single' ? (
            /* Single Question Mode with 1/10 Progress Bar */
            <div className="space-y-5">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Саволи {currentQIndex + 1} аз {questions.length}</span>
                  <span>Ҷавоб дода шуд: {Object.keys(userAnswers).length} / {questions.length}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Question */}
              {(() => {
                const q = questions[currentQIndex];
                const selected = userAnswers[currentQIndex];
                const isAnswered = !!selected;

                return (
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                        Саволи #{currentQIndex + 1}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                        {q.question}
                      </h3>
                    </div>

                    {/* Options A, B, C, D */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optText = q.options[opt];
                        const isThisSelected = selected === opt;
                        const isCorrect = q.correct === opt;

                        let style = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-400';
                        if (isAnswered) {
                          if (isCorrect) {
                            style = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20';
                          } else if (isThisSelected) {
                            style = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold ring-2 ring-rose-500/20';
                          } else {
                            style = 'opacity-50 border-slate-200 dark:border-slate-800 text-slate-500';
                          }
                        }

                        return (
                          <button
                            key={opt}
                            disabled={isAnswered}
                            onClick={() => handleSelectOption(currentQIndex, opt)}
                            className={`w-full p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between gap-3 ${style}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                                isAnswered && isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isAnswered && isThisSelected
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {opt}
                              </span>
                              <span className="leading-snug">{optText}</span>
                            </div>

                            {isAnswered && (
                              <div className="shrink-0">
                                {isCorrect ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                ) : isThisSelected ? (
                                  <XCircle className="w-5 h-5 text-rose-600" />
                                ) : null}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Instant Explanation Box */}
                    {isAnswered && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-1 animate-fade-in">
                        <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          💡 Шарҳи ҷавоб:
                        </span>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}

                    {/* Step Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentQIndex === 0}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Қаблӣ</span>
                      </button>

                      {currentQIndex < questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                          className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1 transition-transform active:scale-95"
                        >
                          <span>Баъдӣ</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => finishQuiz(userAnswers)}
                          disabled={Object.keys(userAnswers).length === 0}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-transform active:scale-95"
                        >
                          Ҷамъбасти натиҷаҳо
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* All Questions on One Page Mode */
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const selected = userAnswers[idx];
                const isAnswered = !!selected;

                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">{idx + 1}.</span>
                        {q.question}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optText = q.options[opt];
                        const isThisSelected = selected === opt;
                        const isCorrect = q.correct === opt;

                        let btnStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400';
                        if (isAnswered) {
                          if (isCorrect) {
                            btnStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (isThisSelected) {
                            btnStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold';
                          } else {
                            btnStyle = 'opacity-40 border-slate-200 dark:border-slate-800';
                          }
                        }

                        return (
                          <button
                            key={opt}
                            disabled={isAnswered}
                            onClick={() => handleSelectOption(idx, opt)}
                            className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 ${btnStyle}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                {opt}
                              </span>
                              <span>{optText}</span>
                            </div>
                            {isAnswered && (
                              <div className="shrink-0">
                                {isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : isThisSelected ? (
                                  <XCircle className="w-4 h-4 text-rose-600" />
                                ) : null}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs">
                        💡 {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="pt-2 text-center">
                <button
                  onClick={() => finishQuiz(userAnswers)}
                  disabled={Object.keys(userAnswers).length === 0}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-transform active:scale-95"
                >
                  Ҷамъбасти ҳамаи ҷавобҳо ({Object.keys(userAnswers).length}/{questions.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Ask Ilmisino Chat Button */}
      <button
        onClick={onOpenChat}
        className="fixed bottom-20 right-4 sm:right-8 z-30 px-5 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/35 flex items-center gap-2.5 transition-transform hover:scale-105 active:scale-95 group"
      >
        <div className="p-1 rounded-full bg-white/20 group-hover:rotate-12 transition-transform">
          <MessageSquare className="w-4 h-4 stroke-[2.5]" />
        </div>
        <span>💬 Аз Илмисино бипурс</span>
      </button>
    </div>
  );
};
