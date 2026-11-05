import { AppSettings, SubjectId, TopicRecord, UserStats } from '../types/index.ts';
import { calculateUserStats, SAMPLE_TOPICS } from '../utils/studyLogic.ts';

const STORAGE_KEYS = {
  TOPICS: 'ilmisino_topics_v1',
  SETTINGS: 'ilmisino_settings_v1',
  CURRENT_TOPIC_ID: 'ilmisino_current_topic_id',
  FLASHCARDS: 'ilmisino_flashcards_v1',
  EXAMS: 'ilmisino_exams_v1',
  STUDY_PLAN: 'ilmisino_study_plan_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  fontSize: 'medium',
  quizDisplayMode: 'single',
  customApiKey: '',
};

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to parse settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getStoredTopics(): TopicRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOPICS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load topics:', e);
  }

  // Seed with rich initial sample topics so the user has immediate access to prepared curriculum
  const seeded = seedInitialTopics();
  saveTopics(seeded);
  return seeded;
}

export function saveTopics(topics: TopicRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  } catch (e) {
    console.error('Failed to save topics to localStorage:', e);
  }
}

export function saveTopic(topic: TopicRecord): TopicRecord[] {
  const all = getStoredTopics();
  const existingIdx = all.findIndex((t) => t.id === topic.id);
  let updated: TopicRecord[];

  if (existingIdx >= 0) {
    updated = [...all];
    updated[existingIdx] = { ...topic, updatedAt: new Date().toISOString() };
  } else {
    updated = [topic, ...all];
  }

  saveTopics(updated);
  return updated;
}

export function deleteTopic(id: string): TopicRecord[] {
  const all = getStoredTopics();
  const filtered = all.filter((t) => t.id !== id);
  saveTopics(filtered);
  return filtered;
}

import { Flashcard, ExamResult, StudyPlan } from '../types/features.ts';

export function getStoredFlashcards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load flashcards:', e);
  }
  const seeded = seedInitialFlashcards();
  saveStoredFlashcards(seeded);
  return seeded;
}

export function saveStoredFlashcards(cards: Flashcard[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save flashcards:', e);
  }
}

export function upsertFlashcards(newCards: Flashcard[]): Flashcard[] {
  const current = getStoredFlashcards();
  const map = new Map<string, Flashcard>();
  current.forEach((c) => map.set(c.id, c));
  newCards.forEach((c) => map.set(c.id, c));
  const merged = Array.from(map.values());
  saveStoredFlashcards(merged);
  return merged;
}

export function getStoredExamResults(): ExamResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load exams:', e);
  }
  return [];
}

export function saveStoredExamResult(result: ExamResult): ExamResult[] {
  const all = getStoredExamResults();
  const updated = [result, ...all];
  try {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save exam:', e);
  }
  return updated;
}

export function getStoredStudyPlan(): StudyPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_PLAN);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load study plan:', e);
  }
  return null;
}

export function saveStoredStudyPlan(plan: StudyPlan): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDY_PLAN, JSON.stringify(plan));
  } catch (e) {
    console.error('Failed to save study plan:', e);
  }
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.TOPICS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_TOPIC_ID);
  localStorage.removeItem(STORAGE_KEYS.FLASHCARDS);
  localStorage.removeItem(STORAGE_KEYS.EXAMS);
  localStorage.removeItem(STORAGE_KEYS.STUDY_PLAN);
}

function seedInitialFlashcards(): Flashcard[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'card-c1',
      subjectId: 'chemistry',
      term: 'Маҳлули сершуда',
      question: 'Маҳлули сершуда (насыщенный раствор) чӣ гуна маҳлул аст?',
      answer: 'Маҳлуле, ки дар ҳарорати додашуда дигар моддаи ҳалшаванда дар он ҳал намешавад.',
      imagePrompt: 'A chemistry beaker with saturated solution and dissolved crystals at the bottom',
      hint: 'Қанд ё намакро дар оби хунук то ҳадди охир андозед',
      example: 'Ним пиёла об ва 5 қошуқ намак — намаки изофӣ дар таги пиёла мешинад.',
      repetitions: 0,
      intervalDays: 0,
      nextReviewDate: today,
      status: 'new',
    },
    {
      id: 'card-b1',
      subjectId: 'biology',
      term: 'Митохондрияҳо',
      question: 'Вазифаи асосии митохондрияҳо дар ҳуҷайра чист?',
      answer: 'Синтези АТФ (энергия) ва нафаскашии ҳуҷайравӣ.',
      imagePrompt: 'Mitochondria organelle powerhouse illustration with inner cristae folds',
      hint: 'Онро «неругоҳи барқии ҳуҷайра» меноманд',
      example: 'Мисли нерӯгоҳи Норак, ки барои бадан барқу қувват истеҳсол мекунад.',
      repetitions: 1,
      intervalDays: 1,
      nextReviewDate: today,
      status: 'learning',
    },
    {
      id: 'card-p1',
      subjectId: 'physics',
      term: 'Қонуни дуюми Нютон',
      question: 'Формула ва таърифи қонуни дуюми Нютон кадом аст?',
      answer: 'F = m · a (Қувва = масса зарби шитоб). Шитоб ба қувва мутаносиби рост ва ба масса чаппа аст.',
      imagePrompt: 'A student pushing a cart on a road demonstrating force mass and acceleration',
      hint: 'F = m · a',
      example: 'Аробачаи вазнинро тела додан назар ба аробачаи холӣ қувваи бештар мехоҳад.',
      repetitions: 2,
      intervalDays: 3,
      nextReviewDate: today,
      status: 'review',
    },
    {
      id: 'card-t1',
      subjectId: 'tajik',
      term: 'Ҷумлаи мураккаби пайваст',
      question: 'Ҷумлаи мураккаби пайваст чӣ гуна сохт дорад?',
      answer: 'Ҷузъҳои он аз ҷиҳати грамматикӣ баробарҳуқуқ буда, бо пайвандакҳои «ва, аммо, лекин, вале, ё» пайваст мешаванд.',
      imagePrompt: 'Two equal bridges connected with a chain representing compound sentence',
      hint: 'Пеш аз «аммо, вале, лекин» ҳамеша вергул меояд',
      example: 'Борон борид, ва сабзаҳо сар кашиданд.',
      repetitions: 0,
      intervalDays: 0,
      nextReviewDate: today,
      status: 'new',
    },
  ];
}

function seedInitialTopics(): TopicRecord[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 86400000 * 2);

  return [
    {
      id: 'sample-chem-1',
      title: 'Ҳалшавандагии моддаҳо дар об',
      subjectId: 'chemistry',
      option: 'Синфи 9',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      cleanText: SAMPLE_TOPICS[0].sampleText,
      testAttempts: [
        {
          id: 'att-chem-1',
          date: now.toISOString(),
          score: 8,
          total: 10,
          percentage: 80,
          userAnswers: {},
        },
      ],
    },
    {
      id: 'sample-bio-1',
      title: 'Сохти ҳуҷайра ва органеллаҳои он',
      subjectId: 'biology',
      option: 'Биологияи умумӣ',
      createdAt: yesterday.toISOString(),
      updatedAt: yesterday.toISOString(),
      cleanText: SAMPLE_TOPICS[1].sampleText,
      testAttempts: [
        {
          id: 'att-bio-1',
          date: yesterday.toISOString(),
          score: 5,
          total: 10,
          percentage: 50, // Weak topic for demonstration
          userAnswers: {},
        },
      ],
    },
    {
      id: 'sample-phys-1',
      title: 'Қонуни дуюми Нютон ва шитоб',
      subjectId: 'physics',
      option: 'Синфи 9',
      createdAt: twoDaysAgo.toISOString(),
      updatedAt: twoDaysAgo.toISOString(),
      cleanText: SAMPLE_TOPICS[2].sampleText,
      testAttempts: [
        {
          id: 'att-phys-1',
          date: twoDaysAgo.toISOString(),
          score: 9,
          total: 10,
          percentage: 90,
          userAnswers: {},
        },
      ],
    },
  ];
}
