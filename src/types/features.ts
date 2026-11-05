export interface Flashcard {
  id: string;
  topicId?: string;
  subjectId: 'chemistry' | 'biology' | 'physics' | 'tajik';
  term: string;
  question: string;
  answer: string;
  imagePrompt: string;
  imageUrl?: string;
  hint: string;
  example?: string;
  // Spaced repetition fields
  repetitions: number;
  intervalDays: number;
  nextReviewDate: string; // ISO date string (YYYY-MM-DD)
  lastReviewedDate?: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
}

export type ReviewGrade = 'again' | 'hard' | 'good'; // 'Намедонам' | 'Каме' | 'Медонам'

export interface ExamQuestion {
  id: string;
  subjectId: 'chemistry' | 'biology' | 'physics' | 'tajik';
  subjectName: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  userAnswer?: 'A' | 'B' | 'C' | 'D';
  isFlagged?: boolean;
}

export interface ExamResult {
  id: string;
  date: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  timeSpentSeconds: number;
  subjectScores: Record<string, { total: number; correct: number; percentage: number }>;
  questions: ExamQuestion[];
}

export interface ProblemSolutionStep {
  stepNumber: number;
  title: 'Дода шудааст' | 'Чӣ меҷӯем' | 'Формула' | 'Ҳисоб' | 'Ҷавоб' | string;
  content: string;
  detailExplanation?: string;
}

export interface ProblemSolution {
  problemText: string;
  subject: string;
  steps: ProblemSolutionStep[];
  finalAnswer: string;
  similarProblem?: {
    text: string;
    answer: string;
  };
}

export interface StudyPlanDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Душанбе, Сешанбе...
  tasks: {
    id: string;
    subject: string;
    title: string;
    durationMinutes: number;
    completed: boolean;
    type: 'theory' | 'flashcards' | 'test' | 'exam';
  }[];
}

export interface StudyPlan {
  id: string;
  examDate: string;
  hoursPerDay: number;
  selectedSubjects: string[];
  ratings: Record<string, 'weak' | 'medium' | 'strong'>;
  days: StudyPlanDay[];
  createdAt: string;
  lastUpdated: string;
}
