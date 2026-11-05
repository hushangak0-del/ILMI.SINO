import { Question } from '../types/index.ts';
import { getStoredSettings } from './storage.ts';

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const settings = getStoredSettings();
  if (settings.customApiKey && settings.customApiKey.trim()) {
    headers['x-gemini-key'] = settings.customApiKey.trim();
  }
  return headers;
}

export async function requestSystemStatus(): Promise<{ status: string; activeModel: string }> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status failed');
    return await res.json();
  } catch {
    return { status: 'offline', activeModel: 'gemini-3.8-flash' };
  }
}

export async function requestSelfTest(): Promise<{
  ok: boolean;
  activeModel?: string;
  latencyMs?: number;
  checks: {
    apiKey: boolean;
    modelResponse: boolean;
    jsonOutput: boolean;
    imageRecognition: boolean;
  };
  message?: string;
  error?: string;
}> {
  const res = await fetch('/api/self-test', {
    method: 'POST',
    headers: getHeaders(),
  });
  return await res.json();
}

export async function requestOcr(payload: {
  images?: { data: string; mimeType: string }[];
  topicName?: string;
  subject?: string;
  option?: string;
  userQuestion?: string;
}, signal?: AbortSignal): Promise<{ title: string; text: string }> {
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ рух дод. Дубора кӯшиш кунед.');
  }
  return data;
}

export async function requestExplanation(payload: {
  title: string;
  text: string;
  subject: string;
  mode?: 'default' | 'simpler' | 'another_example' | 'more_detailed';
}, signal?: AbortSignal): Promise<{ explanation: string }> {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми омодасозии шарҳ рух дод. Дубора кӯшиш кунед.');
  }
  return data;
}

export async function requestSummary(payload: {
  title: string;
  text: string;
  subject: string;
}, signal?: AbortSignal): Promise<{ summary: string }> {
  const res = await fetch('/api/summary', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми сохтани конспект рух дод.');
  }
  return data;
}

export async function requestQuiz(payload: {
  title: string;
  text: string;
  subject: string;
  seed?: number;
}, signal?: AbortSignal): Promise<{ questions: Question[] }> {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми омодасозии тест рух дод.');
  }
  return data;
}

export async function requestChatReply(payload: {
  title: string;
  text: string;
  subject: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  image?: { data: string; mimeType: string };
}, signal?: AbortSignal): Promise<{ reply: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми суҳбат бо омӯзгор рух дод.');
  }
  return data;
}

export async function requestFlashcards(payload: {
  title: string;
  text: string;
  subject: string;
}, signal?: AbortSignal): Promise<{ cards: any[] }> {
  const res = await fetch('/api/flashcards', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми таҳияи карточкаҳо.');
  }
  return data;
}

export async function requestCardImage(payload: {
  imagePrompt: string;
  term: string;
  subject: string;
}): Promise<{ imageUrl: string | null }> {
  try {
    const res = await fetch('/api/generate-card-image', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return { imageUrl: null };
  }
}

export async function requestExamBatch(payload: {
  subjects: string[];
  count?: number;
  batchIndex?: number;
  topicExcerpts?: string[];
}, signal?: AbortSignal): Promise<{ questions: any[] }> {
  const res = await fetch('/api/exam-batch', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми гирифтани саволҳои имтиҳон.');
  }
  return data;
}

export async function requestSolveProblem(payload: {
  problemText?: string;
  image?: { data: string; mimeType: string };
  subject?: string;
  simplerStepNumber?: number;
}, signal?: AbortSignal): Promise<any> {
  const res = await fetch('/api/solve-problem', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми ҳалли масъала.');
  }
  return data;
}

export async function requestStudyPlan(payload: {
  examDate: string;
  hoursPerDay: number;
  selectedSubjects: string[];
  ratings: Record<string, string>;
  weakTopics: string[];
}, signal?: AbortSignal): Promise<{ schedule: any[] }> {
  const res = await fetch('/api/study-plan', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми сохтани нақшаи омодагӣ.');
  }
  return data;
}
