import { Question } from '../types/index.ts';
import { getStoredSettings } from './storage.ts';

export type AppNetworkStatus = 'green' | 'yellow' | 'red';

type StatusListener = (status: AppNetworkStatus, message?: string) => void;
const statusListeners = new Set<StatusListener>();

let currentNetworkStatus: AppNetworkStatus = 'green';
let currentStatusMessage = 'Ҳамаи системаҳо фаъоланд';

export function getNetworkStatus(): { status: AppNetworkStatus; message: string } {
  return { status: currentNetworkStatus, message: currentStatusMessage };
}

export function subscribeNetworkStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(currentNetworkStatus, currentStatusMessage);
  return () => {
    statusListeners.delete(listener);
  };
}

export function setNetworkStatus(status: AppNetworkStatus, message?: string): void {
  currentNetworkStatus = status;
  if (message) currentStatusMessage = message;
  statusListeners.forEach((l) => l(status, currentStatusMessage));
}

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

const BACKOFF_DELAYS = [2000, 3000, 4000];

export interface RetryProgressCallback {
  (attempt: number, max: number, message: string): void;
}

/**
 * Universal client fetch with exponential backoff and friendly Tajik retry updates
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  onProgress?: RetryProgressCallback,
  maxAttempts: number = 4
): Promise<Response> {
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      if (attempt > 1) {
        const msg = `Кӯшиши ${attempt} аз ${maxAttempts}...`;
        setNetworkStatus('yellow', msg);
        if (onProgress) {
          onProgress(attempt, maxAttempts, msg);
        }
      }

      const res = await fetch(url, options);

      // If server busy (503) or rate-limited (429), retry if attempts left
      if ((res.status === 503 || res.status === 429) && attempt < maxAttempts) {
        const delayMs = BACKOFF_DELAYS[attempt - 1] || 2000;
        await new Promise((r) => setTimeout(r, delayMs));
        attempt++;
        continue;
      }

      if (res.ok) {
        setNetworkStatus('green', 'Пайвастшавӣ муқаррарӣ аст');
      } else if (res.status === 503 || res.status === 429) {
        setNetworkStatus('yellow', 'Серверҳо ҳоло банданд');
      } else {
        setNetworkStatus('red', 'Хатогӣ дар сервер');
      }

      return res;
    } catch (err: any) {
      if (options.signal?.aborted) {
        throw err;
      }

      if (attempt < maxAttempts) {
        const nextAttempt = attempt + 1;
        const msg = `Кӯшиши ${nextAttempt} аз ${maxAttempts}...`;
        setNetworkStatus('yellow', msg);
        if (onProgress) {
          onProgress(nextAttempt, maxAttempts, msg);
        }
        const delayMs = BACKOFF_DELAYS[attempt - 1] || 2000;
        await new Promise((r) => setTimeout(r, delayMs));
        attempt++;
      } else {
        setNetworkStatus('red', 'Интернет нест ё пайвастшавӣ қатъ шуд');
        throw err;
      }
    }
  }

  throw new Error('Серверҳо ҳоло банданд. Лутфан 1-2 дақиқа интизор шавед.');
}

export async function requestSystemStatus(): Promise<{ status: string; activeModel: string }> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status failed');
    const data = await res.json();
    setNetworkStatus('green', 'Система омода аст');
    return data;
  } catch {
    setNetworkStatus('red', 'Офлайн (Интернет қатъ шудааст)');
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

export async function requestOcr(
  payload: {
    images?: { data: string; mimeType: string }[];
    topicName?: string;
    subject?: string;
    option?: string;
    userQuestion?: string;
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ title: string; text: string; isTypedTopic?: boolean }> {
  const res = await fetchWithRetry(
    '/api/ocr',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress,
    4
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ рух дод. Дубора кӯшиш кунед.');
  }
  return data;
}

/**
 * Progressive streaming of explanation for fast 1-3s start
 */
export async function requestExplanationStream(
  payload: {
    title: string;
    text: string;
    subject: string;
    mode?: 'default' | 'simpler' | 'another_example' | 'more_detailed';
  },
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch('/api/explain-stream', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    throw new Error('Хатогӣ ҳангоми оғози ҷараёни шарҳ');
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream дастрас нест');
  }

  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.text) {
          accumulated += parsed.text;
          onChunk(parsed.text);
        }
      } catch (parseErr: any) {
        if (parseErr.message && !parseErr.message.includes('Unexpected')) {
          throw parseErr;
        }
      }
    }
  }

  return accumulated;
}

export async function requestExplanation(
  payload: {
    title: string;
    text: string;
    subject: string;
    mode?: 'default' | 'simpler' | 'another_example' | 'more_detailed';
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ explanation: string }> {
  const res = await fetchWithRetry(
    '/api/explain',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress,
    4
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми омодасозии шарҳ рух дод. Дубора кӯшиш кунед.');
  }
  return data;
}

export async function requestSummary(
  payload: {
    title: string;
    text: string;
    subject: string;
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ summary: string }> {
  const res = await fetchWithRetry(
    '/api/summary',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми сохтани конспект рух дод.');
  }
  return data;
}

export async function requestQuiz(
  payload: {
    title: string;
    text: string;
    subject: string;
    seed?: number;
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ questions: Question[] }> {
  const res = await fetchWithRetry(
    '/api/quiz',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми омодасозии тест рух дод.');
  }
  return data;
}

export async function requestChatReply(
  payload: {
    title: string;
    text: string;
    subject: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    image?: { data: string; mimeType: string };
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ reply: string }> {
  const res = await fetchWithRetry(
    '/api/chat',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми суҳбат бо омӯзгор рух дод.');
  }
  return data;
}

export async function requestFlashcards(
  payload: {
    title: string;
    text: string;
    subject: string;
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ cards: any[] }> {
  const res = await fetchWithRetry(
    '/api/flashcards',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress
  );

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

export async function requestExamBatch(
  payload: {
    subjects: string[];
    count?: number;
    batchIndex?: number;
    topicExcerpts?: string[];
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ questions: any[] }> {
  const res = await fetchWithRetry(
    '/api/exam-batch',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми гирифтани саволҳои имтиҳон.');
  }
  return data;
}

export async function requestSolveProblem(
  payload: {
    problemText?: string;
    image?: { data: string; mimeType: string };
    subject?: string;
    simplerStepNumber?: number;
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<any> {
  const res = await fetchWithRetry(
    '/api/solve-problem',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми ҳалли масъала.');
  }
  return data;
}

export async function requestStudyPlan(
  payload: {
    examDate: string;
    hoursPerDay: number;
    selectedSubjects: string[];
    ratings: Record<string, string>;
    weakTopics: string[];
  },
  signal?: AbortSignal,
  onProgress?: RetryProgressCallback
): Promise<{ schedule: any[] }> {
  const res = await fetchWithRetry(
    '/api/study-plan',
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal,
    },
    onProgress
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми сохтани нақшаи омодагӣ.');
  }
  return data;
}

import { ErrorReport } from '../types/reports.ts';

export async function sendReportToBackend(
  report: ErrorReport
): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: report.subject,
      topicTitle: report.topicTitle,
      exactText: report.exactText,
      reason: report.reason,
      comment: report.comment,
      appVersion: report.appVersion || '1.1',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Хатогӣ ҳангоми фиристодани гузориш.');
  }
  return data;
}
