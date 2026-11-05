import { Question, SubjectConfig, SubjectId, TopicRecord, UserStats } from '../types/index.ts';

export const SUBJECTS: Record<SubjectId, SubjectConfig> = {
  chemistry: {
    id: 'chemistry',
    name: 'Химия',
    russianName: 'Химия',
    color: 'emerald',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-500/30 dark:border-emerald-500/50',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    icon: 'FlaskConical',
    description: 'Моддаҳо, реаксияҳо, пайвастагиҳо ва ҳалшавандагӣ',
    options: ['Синфи 8', 'Синфи 9', 'Синфи 10', 'Синфи 11'],
    defaultOption: 'Синфи 9',
  },
  biology: {
    id: 'biology',
    name: 'Биология',
    russianName: 'Биология',
    color: 'amber',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-500/30 dark:border-amber-500/50',
    accentColor: 'text-amber-600 dark:text-amber-400',
    icon: 'Dna',
    description: 'Ҳуҷайраҳо, организмҳо, олами ҳайвонот ва наботот',
    options: ['Анатомия', 'Зоология', 'Ботаника', 'Биологияи умумӣ'],
    defaultOption: 'Анатомия',
  },
  physics: {
    id: 'physics',
    name: 'Физика',
    russianName: 'Физика',
    color: 'sky',
    bgColor: 'bg-sky-50 dark:bg-sky-950/40',
    borderColor: 'border-sky-500/30 dark:border-sky-500/50',
    accentColor: 'text-sky-600 dark:text-sky-400',
    icon: 'Atom',
    description: 'Ҳаракат, қонунҳои Нютон, қувва ва энергия',
    options: ['Синфи 7', 'Синфи 8', 'Синфи 9', 'Синфи 10', 'Синфи 11'],
    defaultOption: 'Синфи 9',
  },
  tajik: {
    id: 'tajik',
    name: 'Забони тоҷикӣ',
    russianName: 'Таджикский язык',
    color: 'purple',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-500/30 dark:border-purple-500/50',
    accentColor: 'text-purple-600 dark:text-purple-400',
    icon: 'BookOpen',
    description: 'Қоидаҳои имло, грамматика, ҳиссаҳои нутқ ва ҷумла',
    options: ['Синфи 8', 'Синфи 9', 'Синфи 10', 'Синфи 11'],
    defaultOption: 'Синфи 10',
  },
};

/**
 * Validates and grades user answers against questions.
 */
export function calculateQuizScore(
  questions: Question[],
  userAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>
): { score: number; total: number; percentage: number; mistakes: { index: number; question: Question; chosen: string }[] } {
  const total = questions.length;
  if (total === 0) {
    return { score: 0, total: 0, percentage: 0, mistakes: [] };
  }

  let score = 0;
  const mistakes: { index: number; question: Question; chosen: string }[] = [];

  questions.forEach((q, idx) => {
    const chosen = userAnswers[idx];
    if (chosen && chosen === q.correct) {
      score += 1;
    } else {
      mistakes.push({
        index: idx,
        question: q,
        chosen: chosen || 'Ҷавоб дода нашудааст',
      });
    }
  });

  const percentage = Math.round((score / total) * 100);
  return { score, total, percentage, mistakes };
}

/**
 * Calculates user statistics, streaks, and identifies weak topics (< 60%).
 */
export function calculateUserStats(topics: TopicRecord[]): UserStats {
  const topicsCount = topics.length;
  let testsCompletedCount = 0;
  let totalScoreSum = 0;
  let totalPercentageSum = 0;

  const subjectAverages: Record<SubjectId, { totalScore: number; testCount: number; avg: number }> = {
    chemistry: { totalScore: 0, testCount: 0, avg: 0 },
    biology: { totalScore: 0, testCount: 0, avg: 0 },
    physics: { totalScore: 0, testCount: 0, avg: 0 },
    tajik: { totalScore: 0, testCount: 0, avg: 0 },
  };

  const weakTopics: { id: string; title: string; subjectId: SubjectId; score: number }[] = [];
  const testDates = new Set<string>();

  topics.forEach((topic) => {
    const attempts = topic.testAttempts || [];
    if (attempts.length > 0) {
      // Find best attempt for this topic
      const bestAttempt = attempts.reduce((prev, curr) => (curr.percentage > prev.percentage ? curr : prev), attempts[0]);
      
      if (bestAttempt.percentage < 60) {
        weakTopics.push({
          id: topic.id,
          title: topic.title,
          subjectId: topic.subjectId,
          score: bestAttempt.percentage,
        });
      }

      attempts.forEach((att) => {
        testsCompletedCount += 1;
        totalPercentageSum += att.percentage;
        totalScoreSum += att.score;

        const sub = subjectAverages[topic.subjectId];
        if (sub) {
          sub.totalScore += att.percentage;
          sub.testCount += 1;
        }

        if (att.date) {
          testDates.add(att.date.split('T')[0]);
        }
      });
    }
  });

  // Calculate subject averages
  (Object.keys(subjectAverages) as SubjectId[]).forEach((subId) => {
    const s = subjectAverages[subId];
    s.avg = s.testCount > 0 ? Math.round(s.totalScore / s.testCount) : 0;
  });

  const overallAverageScore = testsCompletedCount > 0 ? Math.round(totalPercentageSum / testsCompletedCount) : 0;

  // Streak calculation
  const streakDays = calculateStreak(Array.from(testDates));

  return {
    topicsCount,
    testsCompletedCount,
    overallAverageScore,
    streakDays,
    lastStudyDate: testDates.size > 0 ? Array.from(testDates).sort().reverse()[0] : '',
    subjectAverages,
    weakTopics,
  };
}

/**
 * Calculates continuous consecutive study days ending today or yesterday.
 */
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = Array.from(new Set(dates)).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const firstDate = sorted[0];
  if (firstDate !== today && firstDate !== yesterday) {
    return 0; // Streak broken if no activity today or yesterday
  }

  let streak = 1;
  let currentDate = new Date(firstDate);

  for (let i = 1; i < sorted.length; i++) {
    const prevExpected = new Date(currentDate.getTime() - 86400000).toISOString().split('T')[0];
    if (sorted[i] === prevExpected) {
      streak += 1;
      currentDate = new Date(sorted[i]);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Encouragement message based on score for Tajik students.
 */
export function getScoreFeedback(percentage: number): { title: string; message: string; badgeColor: string } {
  if (percentage >= 90) {
    return {
      title: 'Аъло! Офарин!',
      message: 'Шумо мавзӯъро комилан аз худ кардаед. Ин натиҷа дар имтиҳони ММТ роҳи донишгоҳро барои шумо боз мекунад!',
      badgeColor: 'text-emerald-700 bg-emerald-100 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300',
    };
  } else if (percentage >= 70) {
    return {
      title: 'Натиҷаи хуб!',
      message: 'Шумо аксари нуктаҳоро хуб медонед. Фақат чанд хатогии кӯчакро такрор кунед, то ба 100% бирасед.',
      badgeColor: 'text-blue-700 bg-blue-100 border-blue-300 dark:bg-blue-900/60 dark:text-blue-300',
    };
  } else if (percentage >= 50) {
    return {
      title: 'Мӯътадил, метавонед беҳтар шавед!',
      message: 'Асосҳои мавзӯъ фаҳмо ҳастанд, вале тафсилотҳо диққати бештар талаб мекунанд. Бахши "Фаҳмон"-ро бори дигар хонед.',
      badgeColor: 'text-amber-700 bg-amber-100 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300',
    };
  } else {
    return {
      title: 'Мавзӯъ такрор талаб мекунад!',
      message: 'Ҳеҷ гап не, ин фурсати хуб барои ёдгирӣ аст! Бахши "Фаҳмон" ва "Бинавис"-ро аз назар гузаронед ва дубора санҷед.',
      badgeColor: 'text-rose-700 bg-rose-100 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300',
    };
  }
}

/**
 * Pre-loaded sample textbook topics for instant testing without needing physical textbooks.
 */
export const SAMPLE_TOPICS: {
  title: string;
  subjectId: SubjectId;
  option: string;
  excerpt: string;
  sampleText: string;
}[] = [
  {
    title: 'Ҳалшавандагии моддаҳо дар об',
    subjectId: 'chemistry',
    option: 'Синфи 9',
    excerpt: 'Ҳалшавандагӣ, маҳлулҳои сершуда ва канора, таъсири ҳарорат ва фишор ба ҳалшавандагӣ.',
    sampleText: `МАВЗӮИ 14: ҲАЛШАВАНДАГИИ МОДДАҲО ДАР ОБ

Ҳалшавандагӣ ин қобилияти моддаҳо барои пайваст шудан ва маҳлул ҳосил кардан дар дигар модда (маҳлулкунанда) мебошад. Об дар табиат беҳтарин ва паҳншудатарин маҳлулкунанда аст.

1. Маҳлулҳои сершуда ва сернашуда:
Маҳлуле, ки дар ҳарорати додашуда дар он дигар моддаи ҳалшаванда ҳал шуда наметавонад, маҳлули сершуда (насыщенный раствор) номида мешавад. Агар модда боз ҳал шуда тавонад, он маҳлули сернашуда аст.

2. Вобастагии ҳалшавандагӣ аз ҳарорат:
Барои аксарияти моддаҳои сахт (масалан, намак, қанд, нитрати калий KNO3) ҳангоми баланд шудани ҳарорат ҳалшавандагӣ меафзояд. Аммо барои газҳо (масалан, оксиген O2, гази карбонат CO2) бо баланд шудани ҳарорат ҳалшавандагӣ кам мешавад, зеро молекулаҳои газ аз маҳлул хориҷ мешаванд.

3. Омилҳои таъсиркунанда:
- Табиати модда (моддаҳои қутбӣ дар маҳлулкунандаҳои қутбӣ мисли об нағз ҳал мешаванд - қоидаи "монанд дар монанд").
- Дараҷаи майдакунӣ (ҳар қадаре ки кристаллҳо майдатар бошанд, маҳлулшавӣ тезтар меравад).
- Фишор (барои газҳо бо зиёд шудани фишор ҳалшавандагӣ меафзояд - қонуни Ҳенри).`,
  },
  {
    title: 'Сохти ҳуҷайра ва органеллаҳои он',
    subjectId: 'biology',
    option: 'Биологияи умумӣ',
    excerpt: 'Мембрана, ситоплазма, ядро, митохондрияҳо ва рибосомаҳо.',
    sampleText: `МАВЗӮИ 6: СОХТИ ҲУҶАЙРАҲОИ ЭУКАРИОТӢ

Ҳуҷайра воҳиди хурдтарини сохторӣ ва функсионалии ҳамаи организмҳои зинда мебошад. 

1. Қисмҳои асосии ҳуҷайра:
- Мембранаи плазматикӣ: пардаи дуқабатаи фосфолипидӣ бо сафедаҳо, ки дохили ҳуҷайраро аз муҳити беруна муҳофизат мекунад ва интиқоли интихобии моддаҳоро иҷро менамояд.
- Ситоплазма: муҳити ниммоеъи дохили ҳуҷайра, ки дар он ҳамаи органеллаҳо ҷойгиранд ва равандҳои мубодилаи моддаҳо мегузаранд.
- Ядро: маркази идораи ҳуҷайра, ки дар он кислотаи дезоксирибонуклеат (КДН / ДНК) маҳфуз аст ва маълумоти ирсиро нигоҳ медорад.

2. Органеллаҳои муҳим:
- Митохондрияҳо: "неругоҳи барқии" ҳуҷайра, дар онҳо АТФ (аденозинтрифосфат) синтез мешавад ва нафаскашии ҳуҷайравӣ ба амал меояд.
- Рибосомаҳо: органеллаҳои хурдтарини ғайримембранавӣ, ки масъули синтези сафеда мебошанд.
- Тӯри эндоплазматикӣ (ТЭП): системаи каналҳо ва халтачаҳо барои интиқоли моддаҳо дар дохили ҳуҷайра.
- Дастгоҳи Голҷи: тағир додан, бастан ва ихроҷи моддаҳои синтезшуда.
- Пластидаҳо (Хлоропластҳо): танҳо дар ҳуҷайраҳои растанӣ мавҷуданд ва пигменти хлорофилл дошта, фотосинтезро иҷро мекунанд.`,
  },
  {
    title: 'Қонуни дуюми Нютон ва шитоб',
    subjectId: 'physics',
    option: 'Синфи 9',
    excerpt: 'Формулаи асосии динамика F = ma, воҳидҳои ченак ва татбиқи он дар амал.',
    sampleText: `МАВЗӮИ 18: ҚОНУНИ ДУЮМИ НЮТОН

Қонуни дуюми Нютон яке аз қонунҳои асосии механика ва динамика буда, робитаи байни қувваи ба ҷисм таъсиркунанда, массаи он ва шитоби пайдокардаи ҷисмро муайян мекунад.

1. Таърифи қонун:
Шитобе, ки ҷисм таҳти таъсири қувва мегирад, мутаносибан рост ба бузургии ин қувва ва мутаносибан чаппа ба массаи ҷисм мебошад. Самти шитоб ба самти қувваи таъсиркунанда мувофиқ аст.

2. Формулаи математикӣ:
a = F / m  ё ки  F = m * a

Дар ин ҷо:
- F — қувваи амалкунанда (ё ҷамъи векторҳои ҳамаи қувваҳо), бо Нютон (Н) ченак мешавад. 1 Н = 1 кг * м/с².
- m — массаи ҷисм, бо килограмм (кг) ченак мешавад.
- a — шитоби ҷисм, бо метр бар сонияи квадратӣ (м/с²) ченак мешавад.

3. Намунаи ҳалли масъала:
Масъала: Ба аробачаи массааш 5 кг чӣ гуна қувва таъсир бояд кард, то он бо шитоби 2 м/с² ҳаракат кунад?
Ҳал: 
Дода шудааст: m = 5 кг, a = 2 м/с².
Ёфтан лозим: F - ?
Аз рӯи қонуни дуюми Нютон: F = m * a = 5 кг * 2 м/с² = 10 Н.
Ҷавоб: Қувваи зарурӣ 10 Н аст.`,
  },
  {
    title: 'Ҷумлаҳои мураккаби пайваст ва тобеъ',
    subjectId: 'tajik',
    option: 'Синфи 10',
    excerpt: 'Сохти ҷумлаҳои мураккаб, пайвандакҳо ва аломатҳои китобат (вергул).',
    sampleText: `МАВЗӮИ 22: ҶУМЛАҲОИ МУРАККАБ ДАР ЗАБОНИ ТОҶИКӢ

Ҷумлаи мураккаб ҷумлаест, ки аз ду ё зиёда ҷумлаҳои сода (пешниҳодҳо) иборат буда, як маънои умумиро ифода мекунад.

1. Намудҳои ҷумлаи мураккаб:
- Ҷумлаҳои мураккаби пайваст: ҷузъҳои он аз ҷиҳати грамматикӣ баробарҳуқуқ мебошанд ва бо пайвандакҳои па пайвасткунанда (ва, аммо, лекин, вале, ё, ё ин ки) пайваст мешаванд.
  Мисол: Баҳор омад, ва гулҳои кӯҳсор шукуфтанд.
  
- Ҷумлаҳои мураккаби тобеъ: яке аз ҷузъҳо сарҷумла буда, ҷузъи дигар ҷумлаи пайрав номида мешавад ва ба сарҷумла тобеъ мебошад. Пайвандакҳои тобеъкунанда: ки, чунки, зеро, агар, гарчанде, то ки.
  Мисол: Мо донистем, ки имтиҳон ба наздикӣ баргузор мегардад.
  
- Ҷумлаҳои мураккаби бепайвандак: ҷузъҳо танҳо ба воситаи оҳанг (интонация) ва маъно пайваст мешаванд.
  Мисол: Офтоб баромад, рӯз гарм шуд.

2. Аломатҳои китобат (вергул):
Дар байни ҷузъҳои ҷумлаи мураккаб пеш аз пайвандакҳои «аммо», «вале», «лекин», «чунки», «ки» ҳамеша аломати вергул (,) гузошта мешавад.`,
  },
];
