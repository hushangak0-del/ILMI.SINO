import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextReview, getCardsDueToday } from './flashcardsLogic.ts';
import { calculateMolarMass } from './chemistryTools.ts';
import { calculateExamResult } from './examLogic.ts';
import { calculateDaysRemaining } from './studyPlanLogic.ts';
import { Flashcard, ExamQuestion } from '../types/features.ts';

test('Spaced repetition intervals update correctly on student feedback', () => {
  const card: Flashcard = {
    id: 'c1',
    subjectId: 'chemistry',
    term: 'Атом',
    question: 'Атом чист?',
    answer: 'Хурдтарин зарраи тақсимнашавандаи химиявӣ',
    imagePrompt: 'Atom drawing',
    hint: 'Дар физика ва химия',
    repetitions: 0,
    intervalDays: 0,
    nextReviewDate: '2025-01-01',
    status: 'new',
  };

  // 'again' -> stays in session (interval = 0)
  const afterAgain = calculateNextReview(card, 'again');
  assert.equal(afterAgain.intervalDays, 0);
  assert.equal(afterAgain.repetitions, 0);

  // 'hard' -> 1 day interval
  const afterHard = calculateNextReview(card, 'hard');
  assert.equal(afterHard.intervalDays, 1);

  // 'good' first time -> 3 days interval
  const afterGood1 = calculateNextReview(card, 'good');
  assert.equal(afterGood1.intervalDays, 3);
  assert.equal(afterGood1.repetitions, 1);

  // 'good' second time -> 7 days interval
  const afterGood2 = calculateNextReview(afterGood1, 'good');
  assert.equal(afterGood2.intervalDays, 7);
  assert.equal(afterGood2.repetitions, 2);
});

test('calculateMolarMass correctly parses and computes masses for chemical formulas', () => {
  // H2O: H: 2 * 1.008 + O: 15.999 = 18.015
  const water = calculateMolarMass('H2O');
  assert.equal(water.totalMass, 18.015);
  assert.equal(water.breakdown.length, 2);

  // CaCO3: Ca: 40.078 + C: 12.011 + 3*15.999 = 100.086
  const caco3 = calculateMolarMass('CaCO3');
  assert.equal(caco3.totalMass, 100.086);

  // Unknown element error handling
  const invalid = calculateMolarMass('XyZ99');
  assert.ok(invalid.error);
});

test('calculateExamResult accurately tallies total and per-subject scores', () => {
  const mockQuestions: ExamQuestion[] = [
    {
      id: 'q1',
      subjectId: 'chemistry',
      subjectName: 'Химия',
      question: 'Реаксияи эътидол чист?',
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct: 'A',
      explanation: 'test',
      userAnswer: 'A',
    },
    {
      id: 'q2',
      subjectId: 'chemistry',
      subjectName: 'Химия',
      question: 'Савол 2',
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct: 'B',
      explanation: 'test',
      userAnswer: 'C', // wrong
    },
    {
      id: 'q3',
      subjectId: 'physics',
      subjectName: 'Физика',
      question: 'Савол 3',
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct: 'D',
      explanation: 'test',
      userAnswer: 'D', // correct
    },
  ];

  const result = calculateExamResult(mockQuestions, 120);
  assert.equal(result.totalQuestions, 3);
  assert.equal(result.correctCount, 2);
  assert.equal(result.percentage, 67);
  assert.equal(result.subjectScores['Химия'].percentage, 50); // 1 of 2
  assert.equal(result.subjectScores['Физика'].percentage, 100); // 1 of 1
});

test('calculateDaysRemaining computes correct countdown', () => {
  const tomorrow = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
  const days = calculateDaysRemaining(tomorrow);
  assert.ok(days >= 4 && days <= 6);
});

test('calculateResizeDimensions scales down images exceeding maxDimension', async () => {
  const { calculateResizeDimensions, compressImageClient } = await import('./imageCompressor.ts');

  // Landscape image 4000x2000 scaled to max 1280
  const landscape = calculateResizeDimensions(4000, 2000, 1280);
  assert.equal(landscape.width, 1280);
  assert.equal(landscape.height, 640);

  // Portrait image 1500x3000 scaled to max 1280
  const portrait = calculateResizeDimensions(1500, 3000, 1280);
  assert.equal(portrait.height, 1280);
  assert.equal(portrait.width, 640);

  // Small image does not upscale
  const small = calculateResizeDimensions(800, 600, 1280);
  assert.equal(small.width, 800);
  assert.equal(small.height, 600);

  // compressImageClient in node environment returns fallback cleanly
  const res = await compressImageClient('data:image/jpeg;base64,mock', 1280, 0.8);
  assert.ok(res.dataUrl);
});

