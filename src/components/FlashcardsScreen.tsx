import React, { useState, useEffect, useRef, useTransition } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Volume2,
  Check,
  HelpCircle,
  X,
  Shuffle,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  Flame,
  CheckCircle2,
  Flag,
  Gamepad2,
  BookOpen,
  RefreshCw,
  Loader2,
  AlertCircle,
  Award,
} from 'lucide-react';
import { Flashcard, ReviewGrade } from '../types/features.ts';
import {
  calculateNextReview,
  filterHardCards,
  getCardsDueToday,
  shuffleCards,
  generateCardQuizOptions,
  CardQuizOption,
} from '../utils/flashcardsLogic.ts';
import { saveStoredFlashcards, isTextReported } from '../services/storage.ts';
import { requestCardImage } from '../services/api.ts';
import { SUBJECTS } from '../utils/studyLogic.ts';
import { ReportModal } from './ReportModal.tsx';
import { getCachedCardImage, setCachedCardImage, removeCachedCardImage } from '../services/imageDb.ts';
import { AiDisclaimerNotice } from './AiDisclaimerNotice.tsx';

interface FlashcardsScreenProps {
  cards: Flashcard[];
  onUpdateCards: (updated: Flashcard[]) => void;
  onExploreTopics: () => void;
}

export const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({
  cards,
  onUpdateCards,
  onExploreTopics,
}) => {
  // Navigation & Study Mode
  const [filterMode, setFilterMode] = useState<'due' | 'all' | 'hard'>('due');
  const [activeTabMode, setActiveTabMode] = useState<'flashcard' | 'quiz'>('flashcard');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);

  // Session Statistics
  const [knownCount, setKnownCount] = useState<number>(0);
  const [repeatCardIds, setRepeatCardIds] = useState<Set<string>>(new Set());
  const [sessionReviewedCount, setSessionReviewedCount] = useState<number>(0);

  // Card Quiz Game Mode State
  const [quizOptions, setQuizOptions] = useState<CardQuizOption[]>([]);
  const [selectedQuizIdx, setSelectedQuizIdx] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);

  // Image Loading & Regenerating
  const [loadingImageCardId, setLoadingImageCardId] = useState<string | null>(null);
  const failedImageAttemptsRef = useRef<Record<string, number>>({});
  const isGeneratingRef = useRef<boolean>(false);

  // Mistake reporting modal
  const [reportingCard, setReportingCard] = useState<Flashcard | null>(null);

  // Touch Swipe to Flip / Next
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // Initialize active cards based on filter mode
  useEffect(() => {
    let list: Flashcard[];
    if (filterMode === 'due') {
      const due = getCardsDueToday(cards);
      list = due.length > 0 ? due : cards; // Fallback to all if none due
    } else if (filterMode === 'hard') {
      const hard = filterHardCards(cards);
      list = hard.length > 0 ? hard : cards;
    } else {
      list = cards;
    }
    setActiveCards(list);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsSessionComplete(false);
    setKnownCount(0);
    setRepeatCardIds(new Set());
    setSessionReviewedCount(0);
    setSelectedQuizIdx(null);
  }, [filterMode, cards]);

  const currentCard = activeCards[currentIndex];
  const dueCount = getCardsDueToday(cards).length;
  const isCardReported = currentCard
    ? isTextReported(currentCard.question) || isTextReported(currentCard.answer)
    : false;

  // Prepare Quiz Options when in quiz mode
  useEffect(() => {
    if (activeTabMode === 'quiz' && currentCard) {
      const options = generateCardQuizOptions(currentCard, cards);
      setQuizOptions(options);
      setSelectedQuizIdx(null);
    }
  }, [activeTabMode, currentCard?.id]);

  // Background Image Loader & IndexedDB Cache Sync
  useEffect(() => {
    if (!currentCard) return;

    let isMounted = true;

    const checkAndLoadImage = async () => {
      // 1. If already in card object, make sure it's in IndexedDB
      if (currentCard.imageUrl) {
        setCachedCardImage(currentCard.id, currentCard.imageUrl);
        return;
      }

      // 2. Check IndexedDB cache
      const cached = await getCachedCardImage(currentCard.id);
      if (cached && isMounted) {
        const updatedCards = cards.map((c) =>
          c.id === currentCard.id ? { ...c, imageUrl: cached } : c
        );
        onUpdateCards(updatedCards);
        saveStoredFlashcards(updatedCards);
        return;
      }

      // 3. If failed already twice, do not spam API
      const failCount = failedImageAttemptsRef.current[currentCard.id] || 0;
      if (failCount >= 2) return;

      // 4. Load from backend in background without blocking screen
      if (isGeneratingRef.current) return;
      isGeneratingRef.current = true;
      setLoadingImageCardId(currentCard.id);

      try {
        const res = await requestCardImage({
          imagePrompt: currentCard.imagePrompt,
          term: currentCard.term,
          subject: currentCard.subjectId,
        });

        if (isMounted) {
          if (res.imageUrl) {
            await setCachedCardImage(currentCard.id, res.imageUrl);
            const updatedCards = cards.map((c) =>
              c.id === currentCard.id ? { ...c, imageUrl: res.imageUrl || undefined } : c
            );
            onUpdateCards(updatedCards);
            saveStoredFlashcards(updatedCards);
          } else {
            // Failed once, record attempt
            failedImageAttemptsRef.current[currentCard.id] = failCount + 1;
          }
        }
      } catch (e) {
        failedImageAttemptsRef.current[currentCard.id] = failCount + 1;
      } finally {
        isGeneratingRef.current = false;
        if (isMounted) {
          setLoadingImageCardId(null);
        }
      }
    };

    checkAndLoadImage();

    return () => {
      isMounted = false;
    };
  }, [currentCard?.id]);

  // Regenerate image on user demand ("Расми дигар")
  const handleRegenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard || loadingImageCardId === currentCard.id) return;

    setLoadingImageCardId(currentCard.id);
    await removeCachedCardImage(currentCard.id);

    // Temporarily clear image to show loading skeleton
    const clearedCards = cards.map((c) =>
      c.id === currentCard.id ? { ...c, imageUrl: undefined } : c
    );
    onUpdateCards(clearedCards);

    try {
      const res = await requestCardImage({
        imagePrompt: currentCard.imagePrompt,
        term: currentCard.term,
        subject: currentCard.subjectId,
      });

      if (res.imageUrl) {
        await setCachedCardImage(currentCard.id, res.imageUrl);
        const updatedCards = cards.map((c) =>
          c.id === currentCard.id ? { ...c, imageUrl: res.imageUrl || undefined } : c
        );
        onUpdateCards(updatedCards);
        saveStoredFlashcards(updatedCards);
      }
    } catch (err) {
      console.warn('Regenerate image failed:', err);
    } finally {
      setLoadingImageCardId(null);
    }
  };

  // Flip Card Action
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Touch Swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal swipe
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swipe left -> flip or next
        handleFlip();
      } else {
        // Swipe right -> flip
        handleFlip();
      }
    }
  };

  // Student Evaluation: 'again' (Намедонам ❌), 'hard' (Каме 🤔), 'good' (Медонам ✅)
  const handleGrade = (grade: ReviewGrade) => {
    if (!currentCard) return;

    try {
      const updatedCard = calculateNextReview(currentCard, grade);
      const updatedAll = cards.map((c) => (c.id === currentCard.id ? updatedCard : c));
      onUpdateCards(updatedAll);
      saveStoredFlashcards(updatedAll);
      setSessionReviewedCount((prev) => prev + 1);

      if (grade === 'good') {
        setKnownCount((prev) => prev + 1);
      } else {
        setRepeatCardIds((prev) => new Set(prev).add(currentCard.id));
      }

      // Spaced repetition rule:
      // If 'Намедонам ❌', re-insert the card into the current session queue so the student sees it again!
      let nextQueue = [...activeCards];
      if (grade === 'again') {
        nextQueue.push(updatedCard);
      }

      if (currentIndex + 1 < nextQueue.length) {
        setActiveCards(nextQueue);
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
        setSelectedQuizIdx(null);
      } else {
        // Session Complete!
        setIsSessionComplete(true);
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error handling card grade:', err);
      if (currentIndex + 1 < activeCards.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setIsSessionComplete(true);
      }
    }
  };

  // Card Quiz Game Mode Option Selection
  const handleQuizAnswer = (optionIdx: number) => {
    if (selectedQuizIdx !== null || !currentCard) return;
    setSelectedQuizIdx(optionIdx);

    const chosen = quizOptions[optionIdx];
    if (chosen.isCorrect) {
      setQuizScore((prev) => prev + 1);
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      } catch (e) {}
    }

    // Automatically register spaced repetition grade
    setTimeout(() => {
      handleGrade(chosen.isCorrect ? 'good' : 'again');
    }, 1400);
  };

  // Shuffle Cards
  const handleShuffle = () => {
    setActiveCards(shuffleCards(activeCards));
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedQuizIdx(null);
  };

  // Repeat Mistakes Session ("Такрори хатоҳо")
  const handleRepeatMistakes = () => {
    const mistakeCards = cards.filter(
      (c) => repeatCardIds.has(c.id) || c.status === 'learning' || (c.repetitions ?? 0) === 0
    );
    const listToReview = mistakeCards.length > 0 ? mistakeCards : activeCards;
    setActiveCards(shuffleCards(listToReview));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsSessionComplete(false);
    setKnownCount(0);
    setRepeatCardIds(new Set());
    setSessionReviewedCount(0);
    setSelectedQuizIdx(null);
  };

  // Read card aloud via Web Speech API
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tg-TJ';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const subjectConfig = currentCard ? SUBJECTS[currentCard.subjectId] : SUBJECTS.chemistry;

  // Large emoji fallback for each subject
  const getSubjectFallbackEmoji = (subjectId: string) => {
    switch (subjectId) {
      case 'chemistry':
        return '⚗️';
      case 'biology':
        return '🧬';
      case 'physics':
        return '⚛️';
      case 'tajik':
        return '📖';
      default:
        return '💡';
    }
  };

  // Progress percentage
  const progressPercent = activeCards.length > 0
    ? Math.round(((currentIndex + 1) / activeCards.length) * 100)
    : 0;

  return (
    <div className="space-y-4 pb-24 max-w-xl mx-auto">
      {/* Top Header & Mode Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Карточкаҳои омӯзишӣ</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
              12 корт
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Истилоҳотро бо расм ва саволҳо ба таври фосилавӣ аз худ кунед
          </p>
        </div>

        {/* Study Mode Selector: Standard vs Card Quiz */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTabMode('flashcard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'flashcard'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Ҳолати мутолиаи карточкаҳо"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Кортҳо</span>
          </button>

          <button
            onClick={() => setActiveTabMode('quiz')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'quiz'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            title="Бозии карточка бо 4 вариант"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Бозии корт</span>
          </button>

          <button
            onClick={handleShuffle}
            title="Омехта кун"
            className="p-1.5 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setFilterMode('due')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            filterMode === 'due'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Такрори имрӯз ({dueCount})</span>
        </button>

        <button
          onClick={() => setFilterMode('all')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all ${
            filterMode === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Ҳама ({cards.length})
        </button>

        <button
          onClick={() => setFilterMode('hard')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all ${
            filterMode === 'hard'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Танҳо душворҳо
        </button>
      </div>

      {/* Main Flashcard Body */}
      {activeCards.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Ҳамаи карточкаҳо такрор шуданд!
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Барои ин рӯз дигар карточкаи ба таъхир афтода нест. Шумо метавонед ҳамаи карточкаҳоро аз нав тамрин кунед ё аз саҳифаи дарс 12 карточкаи нав созед.
          </p>
          <button
            onClick={() => setFilterMode('all')}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-transform active:scale-95"
          >
            Ҳамаи карточкаҳоро аз нав хондан
          </button>
        </div>
      ) : isSessionComplete ? (
        /* End-of-Session Summary Screen */
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-fade-in shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Офарин! Машқ ба охир расид!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Шумо {sessionReviewedCount} карточкаро мутолиа ва такрор намудед.
            </p>
          </div>

          {/* Detailed Statistics Cards */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-center space-y-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {knownCount}
              </span>
              <span className="block text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                Аз ёд шуд (Медонам ✅)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center space-y-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {repeatCardIds.size}
              </span>
              <span className="block text-[11px] font-extrabold text-amber-800 dark:text-amber-300">
                Барои такрор (Норавшан 🤔)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 max-w-sm mx-auto">
            {repeatCardIds.size > 0 && (
              <button
                onClick={handleRepeatMistakes}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Такрори хатоҳо ({repeatCardIds.size} корт)</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveCards(shuffleCards(cards));
                setCurrentIndex(0);
                setIsFlipped(false);
                setIsSessionComplete(false);
                setKnownCount(0);
                setRepeatCardIds(new Set());
              }}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-xs transition-transform active:scale-95"
            >
              Аз нав оғоз кун
            </button>

            <button
              onClick={onExploreTopics}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-transform active:scale-95"
            >
              Ба саҳифаи дарсҳо
            </button>
          </div>
        </div>
      ) : (
        /* Active Flashcard Viewer */
        <div className="space-y-4">
          {/* Progress Bar & Header */}
          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="text-slate-900 dark:text-white font-extrabold">
                Карточкаи {currentIndex + 1} аз {activeCards.length}
              </span>
              <div className="flex items-center gap-2">
                <span className={subjectConfig.accentColor}>{subjectConfig.name}</span>
                <button
                  type="button"
                  onClick={() => setReportingCard(currentCard)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Хато ёфтам"
                >
                  <Flag className="w-3 h-3 text-amber-500" />
                  <span>Хато ёфтам</span>
                </button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Warning if already reported */}
          {isCardReported && (
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 fill-amber-500 shrink-0" />
              <span>Шумо дар ин карточка хато қайд карда будед. Барномасоз онро баррасӣ мекунад.</span>
            </div>
          )}

          {/* 3D Flip Card Container */}
          <div
            onClick={activeTabMode === 'flashcard' ? handleFlip : undefined}
            onTouchStart={activeTabMode === 'flashcard' ? handleTouchStart : undefined}
            onTouchEnd={activeTabMode === 'flashcard' ? handleTouchEnd : undefined}
            className={`relative min-h-[400px] sm:min-h-[440px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl flex flex-col ${
              activeTabMode === 'flashcard' ? 'cursor-pointer' : ''
            }`}
          >
            {/* Top Image or Illustration with Skeleton & Retry */}
            <div className="h-44 sm:h-52 w-full bg-slate-100 dark:bg-slate-800/80 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
              {loadingImageCardId === currentCard.id ? (
                /* Loading Skeleton: Non-blocking */
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-500">
                    Расми таълимӣ кашида мешавад...
                  </span>
                </div>
              ) : currentCard.imageUrl ? (
                /* High quality illustration */
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.term}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                /* Crisp Subject Graphic & Large Emoji Fallback (Never Empty!) */
                <div className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${subjectConfig.bgColor}`}>
                  <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-800/80 shadow-md backdrop-blur-xs">
                    <span className="text-5xl">{getSubjectFallbackEmoji(currentCard.subjectId)}</span>
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {currentCard.term}
                  </span>
                </div>
              )}

              {/* Action Toolbar on Image */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {/* Regenerate Picture Button ("Расми дигар") */}
                <button
                  type="button"
                  onClick={handleRegenerateImage}
                  disabled={loadingImageCardId === currentCard.id}
                  title="Расми дигар сохтан"
                  className="px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 active:scale-95 transition-transform text-[11px] font-bold flex items-center gap-1 backdrop-blur-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${loadingImageCardId === currentCard.id ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Расми дигар</span>
                </button>

                {/* Speak Card Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(isFlipped ? currentCard.answer : currentCard.question);
                  }}
                  title="Бо овоз хондан"
                  className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 active:scale-95 transition-transform"
                >
                  <Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              {/* Front/Back indicator badge */}
              {activeTabMode === 'flashcard' && (
                <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                  {isFlipped ? 'Ҷавоб (Пушти корт)' : 'Савол (Рӯи корт)'}
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-4">
              {activeTabMode === 'quiz' ? (
                /* MODE: Card Quiz Game (4 Options) */
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                      Мафҳум: {currentCard.term}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                      {currentCard.question}
                    </h3>
                  </div>

                  {/* 4 Choices */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {quizOptions.map((opt, optIdx) => {
                      const isChosen = selectedQuizIdx === optIdx;
                      let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-purple-400';

                      if (selectedQuizIdx !== null) {
                        if (opt.isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20';
                        } else if (isChosen) {
                          btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-bold';
                        } else {
                          btnStyle = 'opacity-40 border-slate-200 dark:border-slate-800';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={selectedQuizIdx !== null}
                          onClick={() => handleQuizAnswer(optIdx)}
                          className={`w-full p-3 rounded-2xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2.5 ${btnStyle}`}
                        >
                          <span className="leading-snug">{opt.text}</span>
                          {selectedQuizIdx !== null && opt.isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          {selectedQuizIdx !== null && isChosen && !opt.isCorrect && (
                            <X className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : !isFlipped ? (
                /* MODE: Flashcard Front */
                <div className="space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {currentCard.term}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentCard.question}
                  </h3>
                </div>
              ) : (
                /* MODE: Flashcard Back Side */
                <div className="space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Ҷавоб:
                    </span>
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                      {currentCard.answer}
                    </p>
                  </div>

                  {currentCard.hint && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
                      💡 <strong>Маслиҳат:</strong> {currentCard.hint}
                    </div>
                  )}

                  {currentCard.example && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                      ✨ <strong>Мисоли рӯзгор:</strong> {currentCard.example}
                    </div>
                  )}
                </div>
              )}

              {/* AI Disclaimer notice & speaker */}
              <div className="pt-2">
                <AiDisclaimerNotice
                  variant="short"
                  speakableText={`${currentCard.term}. ${currentCard.question}. ${isFlipped ? currentCard.answer : ''}`}
                  onReport={() => setReportingCard(currentCard)}
                />
              </div>

              {/* Flip prompt hint */}
              {activeTabMode === 'flashcard' && (
                <div className="pt-1 text-center text-[11px] text-slate-400 font-medium">
                  {isFlipped ? 'Барои баргардонидан пахш кунед' : 'Барои дидани ҷавоб пахш кунед ё ба чап лағжонед 👆'}
                </div>
              )}
            </div>
          </div>

          {/* 3 Large Spaced Repetition Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            <button
              onClick={() => handleGrade('again')}
              className="min-h-[58px] py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm transition-transform active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs"
            >
              <div className="flex items-center gap-1">
                <span>❌</span>
                <span>Намедонам</span>
              </div>
              <span className="text-[10px] text-rose-500 font-normal">Ҳамин ҳол такрор</span>
            </button>

            <button
              onClick={() => handleGrade('hard')}
              className="min-h-[58px] py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm transition-transform active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs"
            >
              <div className="flex items-center gap-1">
                <span>🤔</span>
                <span>Каме</span>
              </div>
              <span className="text-[10px] text-amber-500 font-normal">Баъди 1 рӯз</span>
            </button>

            <button
              onClick={() => handleGrade('good')}
              className="min-h-[58px] py-3 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm transition-transform active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-xs"
            >
              <div className="flex items-center gap-1">
                <span>✅</span>
                <span>Медонам</span>
              </div>
              <span className="text-[10px] text-emerald-500 font-normal">Баъди 3-7 рӯз</span>
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingCard && (
        <ReportModal
          isOpen={!!reportingCard}
          onClose={() => setReportingCard(null)}
          subject={subjectConfig.name}
          topicTitle={reportingCard.term}
          exactText={`${reportingCard.question}\nҶавоб: ${reportingCard.answer}`}
          source="flashcard"
        />
      )}
    </div>
  );
};
