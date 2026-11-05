import { Flashcard, ReviewGrade } from '../types/features.ts';

/**
 * Calculates the next review date and spaced repetition parameters based on student feedback.
 * 'again' (Намедонам ❌): 0 days (due same session / today)
 * 'hard' (Каме 🤔): 1 day
 * 'good' (Медонам ✅): 3 days first time, then 7 days, then 14 days
 */
export function calculateNextReview(card: Flashcard, grade: ReviewGrade): Flashcard {
  const today = new Date().toISOString().split('T')[0];
  let nextInterval: number;
  let nextRepetitions = card.repetitions;
  let nextStatus = card.status;

  if (grade === 'again') {
    nextInterval = 0;
    nextRepetitions = 0;
    nextStatus = 'learning';
  } else if (grade === 'hard') {
    nextInterval = 1;
    nextRepetitions = Math.max(1, card.repetitions);
    nextStatus = 'learning';
  } else {
    // 'good' (Медонам)
    if (card.repetitions === 0) {
      nextInterval = 3;
    } else if (card.repetitions === 1) {
      nextInterval = 7;
    } else {
      nextInterval = Math.round(card.intervalDays * 2.2);
    }
    nextRepetitions = card.repetitions + 1;
    nextStatus = nextRepetitions >= 3 ? 'mastered' : 'review';
  }

  const nextDateObj = new Date(Date.now() + nextInterval * 86400000);
  const nextReviewDate = nextDateObj.toISOString().split('T')[0];

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
  const today = new Date().toISOString().split('T')[0];
  return cards.filter((card) => !card.nextReviewDate || card.nextReviewDate <= today);
}

/**
 * Filters hard cards (either status is learning or repetitions < 1).
 */
export function filterHardCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter((c) => c.status === 'learning' || c.repetitions === 0);
}

/**
 * Deterministically or randomly shuffles cards.
 */
export function shuffleCards<T>(cards: T[]): T[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
