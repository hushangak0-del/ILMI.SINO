export type SubjectId = 'chemistry' | 'biology' | 'physics' | 'tajik';

export interface SubjectConfig {
  id: SubjectId;
  name: string;
  russianName: string;
  color: string; // Tailwind color theme identifier
  bgColor: string;
  borderColor: string;
  accentColor: string;
  icon: string;
  description: string;
  options: string[]; // Grades or Sub-divisions
  defaultOption: string;
}

export interface Question {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface TestAttempt {
  id: string;
  date: string;
  score: number;
  total: number;
  percentage: number;
  userAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>;
}

export interface TopicRecord {
  id: string;
  title: string;
  subjectId: SubjectId;
  option: string; // grade or branch
  createdAt: string;
  updatedAt: string;
  cleanText: string;
  explanation?: string;
  summary?: string;
  quiz?: Question[];
  testAttempts: TestAttempt[];
  images?: string[]; // thumbnail data URLs or sample tags
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  quizDisplayMode: 'single' | 'all';
  customApiKey: string;
}

export interface UserStats {
  topicsCount: number;
  testsCompletedCount: number;
  overallAverageScore: number;
  streakDays: number;
  lastStudyDate: string;
  subjectAverages: Record<SubjectId, { totalScore: number; testCount: number; avg: number }>;
  weakTopics: { id: string; title: string; subjectId: SubjectId; score: number }[];
}
