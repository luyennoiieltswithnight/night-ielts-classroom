import { addDays, differenceInDays } from 'date-fns';
import { Difficulty, VocabularyItem } from '../types';

/**
 * SuperMemo-2 (SM-2) algorithm implementation
 * @param item The vocabulary item being reviewed
 * @param difficulty The difficulty rating (easy, medium, hard, forgotten)
 * @returns Updated vocabulary item with next review date and SRS parameters
 */
export function calculateNextReview(item: VocabularyItem, difficulty: Difficulty): Partial<VocabularyItem> {
  let { interval, easeFactor, repetitionCount } = item;
  
  // Map difficulty to a score (0-5)
  // 5: easy, 4: medium, 3: hard, 0: forgotten
  const score = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 4 : difficulty === 'hard' ? 3 : 0;

  if (score >= 3) {
    // Correct response
    if (repetitionCount === 0) {
      interval = 1;
    } else if (repetitionCount === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitionCount++;
  } else {
    // Incorrect response
    repetitionCount = 0;
    interval = 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = addDays(new Date(), interval).toISOString();

  return {
    interval,
    easeFactor,
    repetitionCount,
    nextReviewDate,
    lastReviewedAt: new Date().toISOString(),
    learnedStatus: repetitionCount >= 3 ? 'mastered' : 'learning'
  };
}

export function getInitialSRSParams() {
  return {
    interval: 0,
    easeFactor: 2.5,
    repetitionCount: 0,
    nextReviewDate: new Date().toISOString(),
    learnedStatus: 'new' as const
  };
}
