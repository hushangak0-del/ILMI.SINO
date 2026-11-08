import { Flashcard, ReviewGrade } from '../types/features.ts';

/**
 * Safely formats a Date object as YYYY-MM-DD string, never throwing RangeError.
 */
export function toIsoDateSafe(date: Date): string {
  try {
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the next review date and spaced repetition parameters based on student feedback.
 * 'again' (Намедонам ❌): 0 days (due same session / today)
 * 'hard' (Каме 🤔): 1 day
 * 'good' (Медонам ✅): 3 days first time, then 7 days, then >=14 days
 */
export function calculateNextReview(card: Flashcard, grade: ReviewGrade): Flashcard {
  const now = new Date();
  const today = toIsoDateSafe(now);

  const safeReps = (typeof card.repetitions === 'number' && Number.isFinite(card.repetitions))
    ? Math.max(0, Math.floor(card.repetitions))
    : 0;

  const safeInterval = (typeof card.intervalDays === 'number' && Number.isFinite(card.intervalDays))
    ? Math.max(0, Math.floor(card.intervalDays))
    : 0;

  let nextInterval: number;
  let nextRepetitions = safeReps;
  let nextStatus = card.status || 'new';

  if (grade === 'again') {
    nextInterval = 0;
    nextRepetitions = 0;
    nextStatus = 'learning';
  } else if (grade === 'hard') {
    nextInterval = 1;
    nextRepetitions = Math.max(1, safeReps);
    nextStatus = 'learning';
  } else {
    // 'good' (Медонам)
    if (safeReps === 0) {
      nextInterval = 3;
    } else if (safeReps === 1) {
      nextInterval = 7;
    } else {
      const base = safeInterval > 0 ? safeInterval : 7;
      nextInterval = Math.max(14, Math.round(base * 2.2));
    }
    nextRepetitions = safeReps + 1;
    nextStatus = nextRepetitions >= 3 ? 'mastered' : 'review';
  }

  // Ensure nextInterval is always a valid, finite, non-negative integer
  if (!Number.isFinite(nextInterval) || nextInterval < 0) {
    nextInterval = 0;
  }

  // Safely construct target calendar date using year/month/day math
  const nextDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + nextInterval);
  const nextReviewDate = toIsoDateSafe(nextDateObj);

  return {
    ...card,
    repetitions: nextRepetitions,
    intervalDays: nextInterval,
    nextReviewDate,
    lastReviewedDate: today,
    status: nextStatus,
  };
}

/**
 * Returns cards that are due today or earlier.
 */
export function getCardsDueToday(cards: Flashcard[]): Flashcard[] {
  const today = toIsoDateSafe(new Date());
  return (cards || []).filter((card) => !card.nextReviewDate || card.nextReviewDate <= today);
}

/**
 * Filters hard cards (either status is learning or repetitions < 1).
 */
export function filterHardCards(cards: Flashcard[]): Flashcard[] {
  return (cards || []).filter((c) => c.status === 'learning' || (c.repetitions ?? 0) === 0);
}

/**
 * Deterministically or randomly shuffles cards.
 */
export function shuffleCards<T>(cards: T[]): T[] {
  const copy = [...(cards || [])];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface CardQuizOption {
  text: string;
  isCorrect: boolean;
  term: string;
}

/**
 * Prepares 4 multiple choice options for Card Quiz game mode:
 * 1 correct answer + 3 plausible distractors from other cards in the deck.
 */
export function generateCardQuizOptions(currentCard: Flashcard, allCards: Flashcard[]): CardQuizOption[] {
  const correctOption: CardQuizOption = {
    text: currentCard.answer,
    isCorrect: true,
    term: currentCard.term,
  };

  const otherCards = (allCards || []).filter((c) => c.id !== currentCard.id && c.answer !== currentCard.answer);
  const shuffledOthers = shuffleCards(otherCards);

  const distractors: CardQuizOption[] = shuffledOthers.slice(0, 3).map((c) => ({
    text: c.answer,
    isCorrect: false,
    term: c.term,
  }));

  const fallbackTexts = [
    'Раванди табдил ёфтани модда бе тағйирёбии хосиятҳои асосии молекулавӣ.',
    'Қонуни бақои энергия ва ҳаракати ҷисмҳо дар фазои озод.',
    'Сохтор ва фаъолияти узвҳо дар шароити муътадили физиологӣ.',
    'Қоидаи имлои ҳамсадоҳо ва пайвандакҳо дар ҷумлаи пайваст.',
  ];

  let fallbackIdx = 0;
  while (distractors.length < 3) {
    const text = fallbackTexts[fallbackIdx % fallbackTexts.length];
    distractors.push({
      text,
      isCorrect: false,
      term: 'Вариант',
    });
    fallbackIdx++;
  }

  return shuffleCards([correctOption, ...distractors]);
}
