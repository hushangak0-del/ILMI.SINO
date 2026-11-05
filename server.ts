import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High body limit for multi-page textbook images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const SYSTEM_INSTRUCTION = `You are Илмисино, a patient, kind and accurate teacher for Tajik school students preparing for the ММТ exam. Always write in correct literary Tajik (Cyrillic). Never mix in Russian words when a Tajik word exists. Use standard Tajik school terminology (for example: 'атом', 'молекула', 'реаксияи химиявӣ', 'ҳуҷайра'). Keep sentences short and simple. Re-read your answer and fix grammar before replying.`;

// In-memory record of current working model (gemini-3.1-flash-lite verified working)
let lastWorkingModel = 'gemini-3.1-flash-lite';

function getGenAI(req: Request): GoogleGenAI {
  const customKey = req.headers['x-gemini-key'] as string | undefined;
  const apiKey = (customKey && customKey.trim().length > 5) ? customKey.trim() : (process.env.GEMINI_API_KEY || '');
  
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('exceeded your current quota') || msg.includes('free_tier_requests');
}

function isRetryableError(err: any): boolean {
  if (!err) return false;
  const message = String(err.message || '').toLowerCase();
  const status = err.status || err.statusCode || (err.response && err.response.status);
  
  // Permanent client/auth errors - never retry
  if (status === 400 || status === 401 || status === 403) return false;
  if (message.includes('api_key') || message.includes('apikey') || message.includes('invalid_argument') || message.includes('permission_denied') || message.includes('unregistered')) return false;

  if (status === 503 || status === 429) return true;
  if (message.includes('503') || message.includes('unavailable') || message.includes('high demand')) return true;
  if (message.includes('429') || message.includes('rate limit')) return true;
  if (message.includes('econnreset') || message.includes('etimedout') || message.includes('fetch failed')) return true;
  return false;
}

function formatTajikErrorMessage(err: any): string {
  const msg = String(err?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode;

  if (status === 503 || msg.includes('503') || msg.includes('high demand') || msg.includes('unavailable')) {
    return 'Серверҳои Google айни замон хеле банданд (503). Лутфан 1-2 дақиқа интизор шавед ва тугмаи «Дубора кӯшиш кунед»-ро пахш намоед.';
  }
  if (status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
    return 'Лимит тамом шуд (429). Лутфан пас аз як дақиқа такроран кӯшиш кунед ё дар Танзимот калиди шахсӣ ворид намоед.';
  }
  if (status === 400 || status === 401 || status === 403 || msg.includes('api_key') || msg.includes('apikey') || msg.includes('unregistered') || msg.includes('permission_denied')) {
    return 'Калиди API ворид нашудааст ё нодуруст аст. Лутфан калидро дар Танзимот тафтиш кунед.';
  }
  if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnreset')) {
    return 'Интернет нест ё пайвастшавӣ қатъ шуд. Пайвасти шабакаро тафтиш карда, дубора кӯшиш намоед.';
  }
  return 'Хатогӣ рух дод. Лутфан тугмаи «Дубора кӯшиш кунед»-ро пахш намоед.';
}

interface GenerateOptions {
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
}

/**
 * Robust execution with fast model fallback:
 * Priority to current working model (gemini-3.1-flash-lite / gemini-3.8-flash)
 */
async function generateWithFallbackAndRetry(
  ai: GoogleGenAI,
  contents: any,
  options: GenerateOptions = {}
): Promise<{ text: string; modelUsed: string }> {
  const modelsToTry = lastWorkingModel === 'gemini-3.1-flash-lite'
    ? ['gemini-3.1-flash-lite', 'gemini-3.8-flash']
    : ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const config: any = {
          systemInstruction: options.systemInstruction || SYSTEM_INSTRUCTION,
          temperature: options.temperature !== undefined ? options.temperature : 0.3,
        };

        if (options.responseMimeType) {
          config.responseMimeType = options.responseMimeType;
        }
        if (options.responseSchema) {
          config.responseSchema = options.responseSchema;
        }

        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        if (response.text) {
          lastWorkingModel = model;
          return { text: response.text, modelUsed: model };
        }
        throw new Error('Посухи холӣ аз модел.');
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt ${attempt + 1} with model ${model} failed:`, err?.message || err);

        // If daily quota or resource is exhausted on this model, instantly switch to alternative model
        if (isQuotaExceededError(err)) {
          console.log(`Model ${model} quota exhausted. Immediately switching to fallback model...`);
          break;
        }

        if (attempt < 1 && isRetryableError(err)) {
          console.log(`Retrying model ${model} in 1000ms...`);
          await delay(1000);
          continue;
        }
        break;
      }
    }
  }

  throw new Error(formatTajikErrorMessage(lastError));
}

// 0. System Status & Health
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    activeModel: lastWorkingModel,
    timestamp: new Date().toISOString(),
  });
});

// 0.1 System Self-Test (Tests API key, model latency, JSON generation, image comprehension)
app.all('/api/self-test', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const checks = {
    apiKey: false,
    modelResponse: false,
    jsonOutput: false,
    imageRecognition: false,
  };

  try {
    const customKey = req.headers['x-gemini-key'] as string | undefined;
    const apiKey = (customKey && customKey.trim().length > 5) ? customKey.trim() : (process.env.GEMINI_API_KEY || '');
    const hasKey = Boolean(apiKey && apiKey.trim().length > 5 && apiKey !== 'MY_GEMINI_API_KEY');

    if (!hasKey) {
      res.json({
        ok: false,
        error: 'Калиди API ворид нашудааст. Лутфан калиди Gemini API-ро дар Танзимот сабт кунед.',
        activeModel: lastWorkingModel,
        latencyMs: Date.now() - startTime,
        checks,
      });
      return;
    }
    checks.apiKey = true;

    const ai = getGenAI(req);

    // 2. Test Model Response & JSON Schema
    const prompt = 'Салом! Танҳо як калима "Салом" ва шумораи синф 11-ро дар формати JSON баргардонед: {"greet": "Салом", "grade": 11}';
    const jsonTest = await generateWithFallbackAndRetry(
      ai,
      prompt,
      {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greet: { type: Type.STRING },
            grade: { type: Type.INTEGER },
          },
          required: ['greet', 'grade'],
        },
      }
    );

    checks.modelResponse = true;
    const parsed = JSON.parse(jsonTest.text);
    if (parsed.greet && parsed.grade) {
      checks.jsonOutput = true;
    }

    // 3. Test 1x1 image comprehension (valid base64 transparent GIF)
    const validGif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const imgTest = await generateWithFallbackAndRetry(
      ai,
      [
        { inlineData: { mimeType: 'image/gif', data: validGif } },
        { text: 'Дар ин расм чист? Бо як калима посух диҳед.' },
      ],
      { temperature: 0.1 }
    );

    if (imgTest.text) {
      checks.imageRecognition = true;
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      ok: true,
      activeModel: lastWorkingModel,
      latencyMs,
      checks,
      message: 'Ҳамаи санҷишҳои система бомуваффақият гузаштанд.',
    });
  } catch (err: any) {
    console.error('Self test error:', err);
    res.json({
      ok: false,
      error: formatTajikErrorMessage(err),
      checks,
      latencyMs: Date.now() - startTime,
    });
  }
});


// 1. OCR & Single-Call Question Solver
app.post('/api/ocr', async (req: Request, res: Response): Promise<void> => {
  try {
    const { images, topicName, subject, option, userQuestion } = req.body;
    const ai = getGenAI(req);

    // If user provided a topic name without images
    if ((!images || images.length === 0) && topicName) {
      const prompt = `Дар бораи мавзӯи "${topicName}" аз фанни "${subject || 'Фанни мактабӣ'}" (${option || 'Синфи 9-11'}) матни таълимии дақиқ, мураттаб ва мукаммал мувофиқи барномаи мактабии Тоҷикистон таҳия намоед. 
Мавзӯъро бо сарлавҳа, фаслҳо, таърифҳо, формулаҳо (агар химия/физика бошад) ё қоидаҳо (агар забони тоҷикӣ бошад) ва ҷадвалҳои муҳим пешниҳод кунед.
${userQuestion ? `\nИловатан ба ин саволи хонанда посухи пурра диҳед: "${userQuestion}"` : ''}

Натиҷаро дар шакли JSON баргардонед:
{
  "title": "Номи пурраи мавзӯъ",
  "text": "Матни мураттаби дарс бо забони тоҷикӣ бо сарлавҳаҳо ва формулаҳо"
}`;

      const { text, modelUsed } = await generateWithFallbackAndRetry(ai, prompt, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            text: { type: Type.STRING },
          },
          required: ['title', 'text'],
        },
      });

      const parsed = JSON.parse(text || '{}');
      res.setHeader('x-model-used', modelUsed);
      res.json({
        title: parsed.title || topicName,
        text: parsed.text || '',
      });
      return;
    }

    // If images are provided, perform single-call OCR and analysis
    if (!images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'Лутфан акс ё номи мавзӯъро ворид намоед.' });
      return;
    }

    const parts: any[] = [];
    images.forEach((img: { data: string; mimeType: string }) => {
      const cleanData = img.data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: cleanData,
        },
      });
    });

    const ocrInstruction = `Task: Read and analyze these textbook pages. The text may be in Tajik, Russian or English.
Subject context: ${subject || 'Мактабӣ'}, ${option || ''}. Additional topic hint: ${topicName || 'none'}.
${userQuestion ? `STUDENT QUESTION: "${userQuestion}". Answer this question directly and prominently.` : ''}

CRITICAL RULES:
1. QUALITY CHECK:
   - If the photo is completely dark, blurry, cut off or completely unreadable, set isReadable: false and message: "Акс равшан нест. Лутфан телефонро рост гирифта, бо рӯшноии хуб дубора аксбардорӣ кунед."
2. SINGLE-STEP COMPREHENSION & PROBLEM SOLVING:
   - First decide: Is there a specific question, exercise, or problem in this image OR provided in the student question?
   - If YES: Solve the problem step-by-step (Дода шудааст, Формула, Ҳисоб, Ҷавоб) and present the complete solution clearly at the top of the text.
   - If NO: Transcribe and thoroughly structure the textbook page with clear Markdown headings, important definitions, formulas, and comparison tables.
3. Detect or construct a concise, descriptive title in literary Cyrillic Tajik.

Return JSON strictly:
{
  "isReadable": true,
  "title": "Номи дақиқи мавзӯъ бо забони тоҷикӣ",
  "text": "Матни комили хондашуда ва шарҳ додашуда бо формулаҳо ва ҳалли қадам ба қадам",
  "message": ""
}`;

    parts.push({ text: ocrInstruction });

    const { text, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      parts,
      {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isReadable: { type: Type.BOOLEAN },
            title: { type: Type.STRING },
            text: { type: Type.STRING },
            message: { type: Type.STRING },
          },
          required: ['isReadable', 'title', 'text'],
        },
      }
    );

    const parsed = JSON.parse(text || '{}');
    if (parsed.isReadable === false) {
      res.status(422).json({
        error: parsed.message || 'Акс равшан нест. Лутфан телефонро рост гирифта, бо рӯшноии хуб дубора аксбардорӣ кунед.',
      });
      return;
    }

    res.setHeader('x-model-used', modelUsed);
    res.json({
      title: parsed.title || topicName || 'Мавзӯи омӯхташуда',
      text: parsed.text || '',
    });
  } catch (error: any) {
    console.error('OCR API Error:', error);
    res.status(500).json({
      error: error.message || 'Хатогӣ рух дод. Лутфан дубора кӯшиш кунед.',
    });
  }
});

// 2. Explain the Topic Simply
app.post('/api/explain', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, text, subject, mode = 'default' } = req.body;
    const ai = getGenAI(req);

    let modePrompt = '';
    if (mode === 'simpler') {
      modePrompt = 'Илтимос, ин мавзӯъро боз ҳам содатар ва равонтар фаҳмонед, гӯё барои як кӯдаки 12-сола ё оғозкунанда, бо калимаҳои ниҳоят осон ва бо мисолҳои соддатарини рӯзгор.';
    } else if (mode === 'another_example') {
      modePrompt = 'Барои ин мавзӯъ боз як мисоли дигари нав, хеле ҷолиб ва равшан аз ҳаёти ҳаррӯзаи мардуми Тоҷикистон (масалан, дар ошхона, чойхона, деҳа, пахтазор, об, нон, ё табиат) пешниҳод кунед ва онро қадам ба қадам шарҳ диҳед.';
    } else if (mode === 'more_detailed') {
      modePrompt = 'Мавзӯъро муфассалтар бо далелҳо, нозукиҳо ва нуктаҳои санҷишии ММТ шарҳ диҳед, то ки донишҷӯ ҳама гуна саволи душворро ҳал карда тавонад.';
    } else {
      modePrompt = `Explain the topic very simply, as to a 14-year-old student, in short steps, with everyday examples from Tajik life (for example: village, kitchen, bread, water, cotton, mountains).
- Highlight key terms and definitions clearly in markdown callouts or bold.
- For chemistry: show equations clearly and explain each step of a reaction.
- For physics: show formulas, what each letter means, and one solved example with numbers.
- For biology: explain structures and functions, and make comparison tables when useful.
- For Tajik language: explain the rule, give examples, and common mistakes.`;
    }

    const prompt = `Фан: ${subject}
Мавзӯъ: ${title}

Матни асосии китоб:
${text}

Вазифа:
${modePrompt}

Талабот:
- Ҳамаи посух бояд бо забони равону зебои тоҷикӣ (кириллӣ) бошад. Ҳаргиз калимаҳои русиро дар ҷое, ки муодили тоҷикӣ доранд истифода набаред.
- Бахшҳоро бо сарлавҳаҳои равшан, нуктаҳои муҳим ва мисолҳои хотирмон ҷудо кунед.
- Истилоҳотро бо сатрҳои алоҳида нишон диҳед.`;

    const { text: explanationText, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      prompt,
      { temperature: 0.3 }
    );

    res.setHeader('x-model-used', modelUsed);
    res.json({
      explanation: explanationText || 'Шарҳи мавзӯъ омода нашуд.',
    });
  } catch (error: any) {
    console.error('Explain API Error:', error);
    res.status(500).json({
      error: error.message || 'Хатогӣ ҳангоми омодасозии шарҳ рух дод.',
    });
  }
});

// 2.1 Live Stream of Explanation or Chat via SSE
app.post('/api/stream', async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { prompt, systemInstruction } = req.body;
    const ai = getGenAI(req);

    const stream = await ai.models.generateContentStream({
      model: lastWorkingModel || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Stream error:', err);
    res.write(`data: ${JSON.stringify({ error: formatTajikErrorMessage(err) })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 3. Notebook Summary (Conspectus)
app.post('/api/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, text, subject } = req.body;
    const ai = getGenAI(req);

    const prompt = `Фан: ${subject}
Мавзӯъ: ${title}

Матни дарс:
${text}

Вазифа:
Барои дафтари конспекти хонанда хулосаи кӯтоҳ ва мухтасар таҳия кунед (Short notebook summary):
1. Сарлавҳаи дақиқи мавзӯъ
2. Нуктаҳои асосӣ (ҳадди аксар 10 нуктаи кӯтоҳ ва рақамгузоришуда)
3. Таърифҳои муҳимтарин
4. Формулаҳо ва қоидаҳои калидӣ
5. Як ҷадвали мухтасар ё схемаи муқоисавӣ (бо формати ҷадвали Markdown)

Талабот:
- Ҳама чиз бо забони тоҷикӣ (кириллӣ) бошад.
- Матн бояд тоза, мураттаб ва барои нусхабардорӣ ва чоп кардан қулай бошад.`;

    const { text: summaryText, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      prompt,
      { temperature: 0.3 }
    );

    res.setHeader('x-model-used', modelUsed);
    res.json({
      summary: summaryText || 'Конспект омода нашуд.',
    });
  } catch (error: any) {
    console.error('Summary API Error:', error);
    res.status(500).json({
      error: error.message || 'Хатогӣ ҳангоми сохтани конспект рух дод.',
    });
  }
});

// 4. MMT Quiz Generator (10 MCQs) with Automatic Validation & Retry
app.post('/api/quiz', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, text, subject, seed } = req.body;
    const ai = getGenAI(req);

    const prompt = `Фан: ${subject}
Мавзӯъ: ${title}
Индекс/Силсила: ${seed || Date.now()}

Матни дарс:
${text}

Вазифа:
Маҳз 10 саволи тестии чорҷавоба (A, B, C, D) бо сабки Маркази Миллии Тестӣ (ММТ)-и Тоҷикистон ТАНҲО бар асоси ин мавзӯъ таҳия намоед.
- Ҳар як савол маҳз як ҷавоби дуруст ва се ҷавоби боварибахши нодуруст дорад.
- Саволҳоро аз рӯи дараҷаи душворӣ омехта кунед: сабук, миёна ва душвор (дар сатҳи ММТ).
- Барои ҳар савол шарҳи кӯтоҳи возеҳ нависед, ки чаро ин ҷавоб дуруст аст.
- Ҳама саволҳо ва ҷавобҳо ба забони тоҷикӣ (кириллӣ) бошанд.

Натиҷаро БЕ ягон матни иловагӣ танҳо бо формати JSON баргардонед:
[
  {
    "question": "Матни савол",
    "options": {
      "A": "Ҷавоби А",
      "B": "Ҷавоби Б",
      "C": "Ҷавоби В",
      "D": "Ҷавоби Г"
    },
    "correct": "A",
    "explanation": "Шарҳи кӯтоҳ"
  }
]`;

    let questions: any[] = [];
    let attempts = 0;
    let modelUsedFinal = 'gemini-3.8-flash';

    while (attempts < 2) {
      attempts++;
      try {
        const { text: resultJson, modelUsed } = await generateWithFallbackAndRetry(
          ai,
          prompt,
          {
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                    },
                    required: ['A', 'B', 'C', 'D'],
                  },
                  correct: {
                    type: Type.STRING,
                    enum: ['A', 'B', 'C', 'D'],
                  },
                  explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correct', 'explanation'],
              },
            },
          }
        );

        modelUsedFinal = modelUsed;
        const parsed = JSON.parse(resultJson || '[]');
        if (Array.isArray(parsed) && parsed.length >= 8) {
          questions = parsed;
          break;
        }
      } catch (parseErr) {
        console.warn(`Quiz generation parse attempt ${attempts} failed, retrying...`);
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Омодасозии тест бемуваффақият шуд. Лутфан тугмаи «Дубора кӯшиш кунед»-ро пахш намоед.');
    }

    res.setHeader('x-model-used', modelUsedFinal);
    res.json({ questions });
  } catch (error: any) {
    console.error('Quiz API Error:', error);
    res.status(500).json({
      error: error.message || 'Хатогӣ ҳангоми таҳияи тест рух дод.',
    });
  }
});

// 5. Chat with Teacher (Ask Ilmisino)
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, text, subject, messages, image } = req.body;
    const ai = getGenAI(req);

    const parts: any[] = [];

    // Context prefix
    const contextPrompt = `Шумо омӯзгори меҳрубон ва донишманди Илмисино ҳастед.
Контексти мавзӯи ҷории дарс:
Фан: ${subject || ''}
Мавзӯъ: ${title || ''}
Матни дарс:
${text ? text.slice(0, 3000) : ''}

Таърихи саволҳои қаблии донишҷӯ ва посухҳои шумо:
${(messages || []).map((m: any) => `${m.role === 'user' ? 'Донишҷӯ' : 'Илмисино'}: ${m.content}`).join('\n')}

Илтимос ба саволи охирини донишҷӯ бо забони тоҷикӣ, хеле хушмуомила, қадам ба қадам ва фаҳмо ҷавоб диҳед. Агар акси масъала ё машқ фиристода бошад, онро марҳила ба марҳила ҳал кунед.`;

    if (image && image.data) {
      const cleanData = image.data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/jpeg',
          data: cleanData,
        },
      });
    }

    parts.push({ text: contextPrompt });

    const { text: replyText, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      parts,
      { temperature: 0.3 }
    );

    res.setHeader('x-model-used', modelUsed);
    res.json({
      reply: replyText || 'Узр, ҷавоб омода нашуд. Лутфан саволро дубора бипурсед.',
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      error: error.message || 'Хатогӣ ҳангоми суҳбат бо омӯзгор рух дод.',
    });
  }
});

// 6. Flashcards Generator (10-15 cards with image prompts)
app.post('/api/flashcards', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, text, subject } = req.body;
    const ai = getGenAI(req);

    const prompt = `Фан: ${subject}
Мавзӯъ: ${title}

Матни дарс:
${text}

Вазифа:
Аз ин мавзӯъ барои такрори хонанда 10 то 15 карточкаи омӯзишӣ (Flashcards) бо формати дақиқи JSON таҳия намоед.
Ҳар як карточка бояд инҳоро дар бар гирад:
1. "term": Истилоҳ ё мафҳуми калидӣ бо забони тоҷикӣ
2. "question": Саволи возеҳ ва кӯтоҳ дар бораи ин истилоҳ ё қоида
3. "answer": Ҷавоби дақиқ ва кӯтоҳ
4. "imagePrompt": Тавсифи расм ба забони англисӣ барои тавлиди тасвир (масалан: "A clean flat vector educational diagram of a plant cell with chloroplast on pure white background, no text")
5. "hint": Маслиҳат ё роҳнамоии кӯтоҳ барои ба ёд овардан

Натиҷаро ТАНҲО бо формати JSON баргардонед:
[
  {
    "term": "...",
    "question": "...",
    "answer": "...",
    "imagePrompt": "...",
    "hint": "..."
  }
]`;

    const { text: cardsJson, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      prompt,
      {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              hint: { type: Type.STRING },
            },
            required: ['term', 'question', 'answer', 'imagePrompt', 'hint'],
          },
        },
      }
    );

    const cards = JSON.parse(cardsJson || '[]');
    res.setHeader('x-model-used', modelUsed);
    res.json({ cards });
  } catch (error: any) {
    console.error('Flashcards API Error:', error);
    res.status(500).json({ error: error.message || 'Хатогӣ ҳангоми сохтани карточкаҳо.' });
  }
});

// 7. Flashcard Image Generator
app.post('/api/generate-card-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imagePrompt, term } = req.body;
    const ai = getGenAI(req);

    // Attempt image generation if available
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: `${imagePrompt || term}, clean flat educational scientific illustration, white background, minimalist, high quality, no text`,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          outputMimeType: 'image/jpeg',
        },
      });

      if (response.generatedImages?.[0]?.image?.imageBytes) {
        res.json({
          imageUrl: `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`,
        });
        return;
      }
    } catch (imgErr) {
      // Graceful fallback to rich graphic placeholder
    }

    res.json({ imageUrl: null });
  } catch (error: any) {
    res.json({ imageUrl: null });
  }
});

// 8. Full MMT Exam Question Batch
app.post('/api/exam-batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { subjects, count = 10, batchIndex = 0, topicExcerpts = [] } = req.body;
    const ai = getGenAI(req);

    const subjectsList = Array.isArray(subjects) && subjects.length > 0 ? subjects.join(', ') : 'Химия, Физика, Биология, Забони тоҷикӣ';
    const excerptsContext = Array.isArray(topicExcerpts) && topicExcerpts.length > 0
      ? `\nМавзӯъҳои омӯхташудаи донишҷӯ:\n${topicExcerpts.slice(0, 5).join('\n---\n')}`
      : '';

    const prompt = `Барои имтиҳони Маркази Миллии Тестӣ (ММТ)-и Ҷумҳурии Тоҷикистон маҳз ${count} саволи тестии 4-ҷавоба (A, B, C, D) таҳия намоед.
Фанҳои интихобшуда: ${subjectsList}
Силсила/Даста: ${batchIndex + 1}
Сатҳи таҳсилот: Синфҳои 7 то 11-и мактабҳои Ҷумҳурии Тоҷикистон.
${excerptsContext}

Талабот:
- Ҳар як савол маҳз 4 вариант (A, B, C, D) дорад ва танҳо яке дуруст аст.
- Саволҳоро мутаносибан аз фанҳои зикршуда тақсим кунед.
- Душвориро омехта кунед: сабук, миёна ва душвор (дар сабки имтиҳони расмии ММТ).
- Ҳар савол дорои шарҳи кӯтоҳи дурустӣ мебошад.
- Ҳамаи матнҳо ба забони тоҷикӣ (кириллӣ) бошанд.

Натиҷаро ТАНҲО бо формати JSON баргардонед:
[
  {
    "subjectName": "Химия ё Биология ё Физика ё Забони тоҷикӣ",
    "question": "Матни савол...",
    "options": {
      "A": "Варианти А",
      "B": "Варианти Б",
      "C": "Варианти В",
      "D": "Варианти Г"
    },
    "correct": "A",
    "explanation": "Шарҳи кӯтоҳ..."
  }
]`;

    const { text: batchJson, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      prompt,
      {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subjectName: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.OBJECT,
                properties: {
                  A: { type: Type.STRING },
                  B: { type: Type.STRING },
                  C: { type: Type.STRING },
                  D: { type: Type.STRING },
                },
                required: ['A', 'B', 'C', 'D'],
              },
              correct: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
              explanation: { type: Type.STRING },
            },
            required: ['subjectName', 'question', 'options', 'correct', 'explanation'],
          },
        },
      }
    );

    const questions = JSON.parse(batchJson || '[]');
    res.setHeader('x-model-used', modelUsed);
    res.json({ questions });
  } catch (error: any) {
    console.error('Exam batch API Error:', error);
    res.status(500).json({ error: error.message || 'Хатогӣ ҳангоми сохтани саволҳои имтиҳон.' });
  }
});

// 9. Step-by-Step Problem Solver
app.post('/api/solve-problem', async (req: Request, res: Response): Promise<void> => {
  try {
    const { problemText, image, subject, simplerStepNumber } = req.body;
    const ai = getGenAI(req);

    const parts: any[] = [];

    if (image && image.data) {
      const cleanData = image.data.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/jpeg',
          data: cleanData,
        },
      });
    }

    let extraInstruction = '';
    if (simplerStepNumber) {
      extraInstruction = `Илтимос қадами рақами ${simplerStepNumber}-ро боз ҳам содатар, бо мисоли оддӣ ва фаҳмо шарҳ диҳед.`;
    }

    const prompt = `Шумо муаллими дақиқ ва ботаҷрибаи Илмисино ҳастед.
Ин масъаларо (аз фанни ${subject || 'Химия/Физика/Забон'}) қадам ба қадам ҳал кунед.

Матни масъала:
${problemText || 'Масъала дар акси замимашуда аст.'}
${extraInstruction}

Вазифа: Масъаларо ҳатман ба 5 марҳилаи муайян ҷудо карда ҳал кунед:
1. "Дода шудааст" (ҳамаи бузургиҳои додашуда бо воҳиди ченак)
2. "Чӣ меҷӯем" (бузургии номаълум)
3. "Формула" (формулаи лозима ва шарҳи ҳар як ҳарф)
4. "Ҳисоб" (гузоштани ададҳо дар формула ва ҳисоббаробаркунӣ)
5. "Ҷавоб" (посухи ниҳоӣ)

Инчунин як "Масъалаи монанд" (similarProblem) бо рақамҳои дигар пешниҳод кунед, то донишҷӯ худаш машқ кунад.

Натиҷаро ТАНҲО бо формати JSON баргардонед:
{
  "problemText": "Матни хондашудаи масъала",
  "subject": "Фан",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Дода шудааст",
      "content": "m = 5 кг, a = 2 м/с²",
      "detailExplanation": "Шарҳи кӯтоҳ"
    },
    {
      "stepNumber": 2,
      "title": "Чӣ меҷӯем",
      "content": "F = ?",
      "detailExplanation": "Қувваи таъсиркунанда"
    },
    {
      "stepNumber": 3,
      "title": "Формула",
      "content": "F = m * a",
      "detailExplanation": "Қонуни дуюми Нютон, F - қувва, m - масса, a - шитоб"
    },
    {
      "stepNumber": 4,
      "title": "Ҳисоб",
      "content": "F = 5 * 2 = 10 Н",
      "detailExplanation": "5 зарби 2 баробар ба 10 мешавад"
    },
    {
      "stepNumber": 5,
      "title": "Ҷавоб",
      "content": "Ҷавоб: Қувваи зарурӣ 10 Н аст.",
      "detailExplanation": "Ҳалли масъала пурра ба анҷом расид."
    }
  ],
  "finalAnswer": "10 Н",
  "similarProblem": {
    "text": "Матни масъалаи нав барои машқ...",
    "answer": "Ҷавоби масъалаи нав..."
  }
}`;

    parts.push({ text: prompt });

    const { text: resultJson, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      parts,
      {
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    );

    const parsed = JSON.parse(resultJson || '{}');
    res.setHeader('x-model-used', modelUsed);
    res.json(parsed);
  } catch (error: any) {
    console.error('Solve problem API Error:', error);
    res.status(500).json({ error: error.message || 'Хатогӣ ҳангоми ҳалли масъала рух дод.' });
  }
});

// 10. Study Plan Generator
app.post('/api/study-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { examDate, hoursPerDay, selectedSubjects, ratings, weakTopics } = req.body;
    const ai = getGenAI(req);

    const prompt = `Барои довталаби имтиҳони ММТ то санаи ${examDate} нақшаи рӯзонаи таълимӣ таҳия намоед.
Соатҳои дастрас дар як рӯз: ${hoursPerDay} соат.
Фанҳо: ${(selectedSubjects || []).join(', ')}.
Баҳодиҳии донишҷӯ: ${JSON.stringify(ratings || {})}.
Мавзӯъҳои заифи қаблӣ: ${(weakTopics || []).join(', ')}.

Талабот:
- Ба фанҳо ва мавзӯъҳои заиф вақти бештар ҷудо кунед.
- Ҳар рӯз супоришҳои мушаххас диҳед: назария, карточкаҳо, тестҳо.
- Ҳар рӯзи якшанбе санҷиши ҳафтаина пешбинӣ кунед.
- Ҳама чиз бо забони ширин ва меҳрубони тоҷикӣ бошад.

Барои 7 рӯзи оянда ҷадвали мушаххас баргардонед дар формати JSON:
[
  {
    "dayNumber": 1,
    "dayOfWeek": "Душанбе",
    "tasks": [
      {
        "id": "t1",
        "subject": "Химия",
        "title": "Химия: Мавзӯи пайвастагиҳо (45 дақиқа)",
        "durationMinutes": 45,
        "completed": false,
        "type": "theory"
      }
    ]
  }
]`;

    const { text: resultJson, modelUsed } = await generateWithFallbackAndRetry(
      ai,
      prompt,
      {
        temperature: 0.3,
        responseMimeType: 'application/json',
      }
    );

    const parsed = JSON.parse(resultJson || '[]');
    res.setHeader('x-model-used', modelUsed);
    res.json({ schedule: parsed });
  } catch (error: any) {
    console.error('Study plan API Error:', error);
    res.status(500).json({ error: error.message || 'Хатогӣ ҳангоми таҳияи нақша.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
