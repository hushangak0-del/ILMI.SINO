import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuizScore, calculateStreak, calculateUserStats, getScoreFeedback } from './studyLogic.ts';
import { Question, TopicRecord } from '../types/index.ts';

const mockQuestions: Question[] = [
  {
    question: 'Воҳиди ченаки қувва дар системаи байналмилалӣ чист?',
    options: { A: 'Ҷоул', B: 'Нютон', C: 'Ватт', D: 'Паскал' },
    correct: 'B',
    explanation: 'Қувва бо Нютон (Н) ченак карда мешавад.',
  },
  {
    question: 'Формулаи қонуни дуюми Нютон кадом аст?',
    options: { A: 'E = mc²', B: 'P = UI', C: 'F = ma', D: 'v = s/t' },
    correct: 'C',
    explanation: 'Қонуни дуюми Нютон: F = m * a.',
  },
];

test('calculateQuizScore computes correct score and detects mistakes', () => {
  const result = calculateQuizScore(mockQuestions, { 0: 'B', 1: 'C' });
  assert.equal(result.score, 2);
  assert.equal(result.total, 2);
  assert.equal(result.percentage, 100);
  assert.equal(result.mistakes.length, 0);

  const partial = calculateQuizScore(mockQuestions, { 0: 'B', 1: 'A' });
  assert.equal(partial.score, 1);
  assert.equal(partial.percentage, 50);
  assert.equal(partial.mistakes.length, 1);
  assert.equal(partial.mistakes[0].chosen, 'A');
});

test('calculateStreak accurately identifies consecutive active days', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dayBefore = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

  assert.equal(calculateStreak([today, yesterday, dayBefore]), 3);
  assert.equal(calculateStreak([yesterday, dayBefore]), 2);
  assert.equal(calculateStreak(['2025-01-01']), 0); // Broken streak
  assert.equal(calculateStreak([]), 0);
});

test('calculateUserStats identifies weak topics below 60%', () => {
  const mockTopics: TopicRecord[] = [
    {
      id: 'top-1',
      title: 'Қонуни Нютон',
      subjectId: 'physics',
      option: 'Синфи 9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cleanText: 'Матн',
      testAttempts: [
        {
          id: 'att-1',
          date: new Date().toISOString(),
          score: 4,
          total: 10,
          percentage: 40,
          userAnswers: {},
        },
      ],
    },
    {
      id: 'top-2',
      title: 'Ҳалшавандагӣ',
      subjectId: 'chemistry',
      option: 'Синфи 9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cleanText: 'Матн',
      testAttempts: [
        {
          id: 'att-2',
          date: new Date().toISOString(),
          score: 9,
          total: 10,
          percentage: 90,
          userAnswers: {},
        },
      ],
    },
  ];

  const stats = calculateUserStats(mockTopics);
  assert.equal(stats.topicsCount, 2);
  assert.equal(stats.testsCompletedCount, 2);
  assert.equal(stats.overallAverageScore, 65); // (40 + 90)/2 = 65
  assert.equal(stats.weakTopics.length, 1);
  assert.equal(stats.weakTopics[0].id, 'top-1');
  assert.equal(stats.weakTopics[0].score, 40);
});

test('getScoreFeedback gives appropriate encouraging feedback in Tajik', () => {
  assert.match(getScoreFeedback(95).title, /Аъло/);
  assert.match(getScoreFeedback(75).title, /Натиҷаи хуб/);
  assert.match(getScoreFeedback(40).title, /Мавзӯъ такрор/);
});
