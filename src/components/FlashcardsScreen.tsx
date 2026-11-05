import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Flashcard, ReviewGrade } from '../types/features.ts';
import {
  calculateNextReview,
  filterHardCards,
  getCardsDueToday,
  shuffleCards,
} from '../utils/flashcardsLogic.ts';
import { saveStoredFlashcards } from '../services/storage.ts';
import { requestCardImage } from '../services/api.ts';
import { SUBJECTS } from '../utils/studyLogic.ts';

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
  const [filterMode, setFilterMode] = useState<'due' | 'all' | 'hard'>('due');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState<number>(0);

  // Initialize active cards based on filter
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
  }, [filterMode, cards]);

  const currentCard = activeCards[currentIndex];
  const dueCount = getCardsDueToday(cards).length;

  // Background image loader for cards that lack an image
  useEffect(() => {
    if (!currentCard || currentCard.imageUrl) return;

    let isMounted = true;
    requestCardImage({
      imagePrompt: currentCard.imagePrompt,
      term: currentCard.term,
      subject: currentCard.subjectId,
    }).then((res) => {
      if (isMounted && res.imageUrl) {
        const updatedCards = cards.map((c) =>
          c.id === currentCard.id ? { ...c, imageUrl: res.imageUrl || undefined } : c
        );
        onUpdateCards(updatedCards);
        saveStoredFlashcards(updatedCards);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentCard?.id]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleGrade = (grade: ReviewGrade) => {
    if (!currentCard) return;

    const updatedCard = calculateNextReview(currentCard, grade);
    const updatedAll = cards.map((c) => (c.id === currentCard.id ? updatedCard : c));
    onUpdateCards(updatedAll);
    saveStoredFlashcards(updatedAll);
    setSessionReviewedCount((prev) => prev + 1);

    // If 'again', insert back into current queue so student sees it again this session!
    let nextQueue = [...activeCards];
    if (grade === 'again') {
      nextQueue.push(updatedCard);
    }

    if (currentIndex + 1 < nextQueue.length) {
      setActiveCards(nextQueue);
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      // Completed!
      setIsSessionComplete(true);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  const handleShuffle = () => {
    setActiveCards(shuffleCards(activeCards));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      // Try tajik or russian voice if available
      utterance.lang = 'tg-TJ';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const subjectConfig = currentCard ? SUBJECTS[currentCard.subjectId] : SUBJECTS.chemistry;

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>Карточкаҳои омӯзишӣ</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
              Такрори фосилавӣ
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Истилоҳотро бо расм ва саволҳо зуд дар хотир нигоҳ доред
          </p>
        </div>

        <button
          onClick={handleShuffle}
          title="Омехта кардани карточкаҳо"
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <Shuffle className="w-4 h-4" />
        </button>
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
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            Ҳамаи карточкаҳо такрор шуданд!
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Барои ин рӯз дигар карточкаи ба таъхир афтода нест. Шумо метавонед аз саҳифаи дарс карточкаҳои нав созед.
          </p>
          <button
            onClick={() => setFilterMode('all')}
            className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-bold text-xs"
          >
            Ҳамаи карточкаҳоро аз нав хондан
          </button>
        </div>
      ) : isSessionComplete ? (
        /* Session Completed Screen */
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-fade-in shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Офарин! Машқ ба охир расид!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Шумо {sessionReviewedCount} карточкаро мутолиа кардед. Карточкаҳо мувофиқи қоидаи такрори фосилавӣ ба рӯзҳои баъдӣ ба нақша гирифта шуданд.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setActiveCards(shuffleCards(cards));
                setCurrentIndex(0);
                setIsFlipped(false);
                setIsSessionComplete(false);
              }}
              className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-xs"
            >
              Аз нав оғоз кун
            </button>
            <button
              onClick={onExploreTopics}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
            >
              Ба саҳифаи дарсҳо
            </button>
          </div>
        </div>
      ) : (
        /* Active Flashcard */
        <div className="space-y-4">
          {/* Card Progress */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            <span>Карточкаи {currentIndex + 1} аз {activeCards.length}</span>
            <span className={subjectConfig.accentColor}>{subjectConfig.name}</span>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={handleFlip}
            className="relative cursor-pointer min-h-[380px] sm:min-h-[420px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl flex flex-col"
          >
            {/* Top Image or Illustration */}
            <div className="h-44 sm:h-48 w-full bg-slate-100 dark:bg-slate-800/80 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
              {currentCard.imageUrl ? (
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.term}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                /* Crisp Educational Graphic Fallback */
                <div className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${subjectConfig.bgColor}`}>
                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 shadow-md">
                    <span className="text-4xl">
                      {currentCard.subjectId === 'chemistry'
                        ? '⚗️'
                        : currentCard.subjectId === 'biology'
                        ? '🧬'
                        : currentCard.subjectId === 'physics'
                        ? '⚛️'
                        : '📖'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {currentCard.term}
                  </span>
                </div>
              )}

              {/* Speak Card Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakText(isFlipped ? currentCard.answer : currentCard.question);
                }}
                title="Бо овоз хондан"
                className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 active:scale-95 transition-transform"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                {isFlipped ? 'Ҷавоб (Пушти корт)' : 'Савол (Рӯи корт)'}
              </div>
            </div>

            {/* Card Content (Front vs Back) */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-4">
              {!isFlipped ? (
                /* Front Side */
                <div className="space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {currentCard.term}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentCard.question}
                  </h3>
                </div>
              ) : (
                /* Back Side */
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

              {/* Flip prompt hint */}
              <div className="pt-2 text-center text-[11px] text-slate-400 font-medium">
                {isFlipped ? 'Барои баргардонидан пахш кунед' : 'Барои дидани ҷавоб пахш кунед 👆'}
              </div>
            </div>
          </div>

          {/* 3 Response Buttons (Spaced Repetition) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            <button
              onClick={() => handleGrade('again')}
              className="py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 shadow-xs"
            >
              <span className="text-sm">❌</span>
              <span>Намедонам</span>
              <span className="text-[9px] text-rose-500 font-normal">Ҳамин ҳол</span>
            </button>

            <button
              onClick={() => handleGrade('hard')}
              className="py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 font-bold text-xs transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 shadow-xs"
            >
              <span className="text-sm">🤔</span>
              <span>Каме</span>
              <span className="text-[9px] text-amber-500 font-normal">Пагоҳ</span>
            </button>

            <button
              onClick={() => handleGrade('good')}
              className="py-3 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-transform active:scale-95 flex flex-col items-center justify-center gap-1 shadow-xs"
            >
              <span className="text-sm">✅</span>
              <span>Медонам</span>
              <span className="text-[9px] text-emerald-500 font-normal">Баъди 3-7 рӯз</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
