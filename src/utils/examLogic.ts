import { ExamQuestion, ExamResult } from '../types/features.ts';

export function calculateExamResult(
  questions: ExamQuestion[],
  timeSpentSeconds: number
): ExamResult {
  let correctCount = 0;
  const subjectScores: Record<string, { total: number; correct: number; percentage: number }> = {};

  questions.forEach((q) => {
    if (!subjectScores[q.subjectName]) {
      subjectScores[q.subjectName] = { total: 0, correct: 0, percentage: 0 };
    }
    subjectScores[q.subjectName].total += 1;

    if (q.userAnswer && q.userAnswer === q.correct) {
      correctCount += 1;
      subjectScores[q.subjectName].correct += 1;
    }
  });

  // Calculate percentages
  Object.keys(subjectScores).forEach((sub) => {
    const s = subjectScores[sub];
    s.percentage = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return {
    id: 'exam_' + Date.now().toString(36),
    date: new Date().toISOString(),
    totalQuestions: total,
    correctCount,
    percentage,
    timeSpentSeconds,
    subjectScores,
    questions,
  };
}

export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
