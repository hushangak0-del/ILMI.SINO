import { StudyPlan, StudyPlanDay } from '../types/features.ts';

export function calculateDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr).getTime();
  if (isNaN(target)) return 0;
  const now = new Date().setHours(0, 0, 0, 0);
  const diff = target - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}

export function generateInitialSchedule(
  examDate: string,
  hoursPerDay: number,
  selectedSubjects: string[],
  ratings: Record<string, 'weak' | 'medium' | 'strong'>
): StudyPlanDay[] {
  const days: StudyPlanDay[] = [];
  const daysOfWeek = ['Якшанбе', 'Душанбе', 'Сешанбе', 'Чоршанбе', 'Панҷшанбе', 'Ҷумъа', 'Шанбе'];
  const today = new Date();

  // Create 14 days of plan ahead
  for (let i = 0; i < 14; i++) {
    const cur = new Date(today.getTime() + i * 86400000);
    const dateStr = cur.toISOString().split('T')[0];
    const dayName = daysOfWeek[cur.getDay()];
    const isSunday = cur.getDay() === 0;

    const tasks: StudyPlanDay['tasks'] = [];

    if (isSunday) {
      // Sunday is Weekly mini exam day
      tasks.push({
        id: `task_${dateStr}_exam`,
        subject: 'Ҳамаи фанҳо',
        title: 'Санҷиши ҳафтаинаи ММТ (30 савол)',
        durationMinutes: 45,
        completed: false,
        type: 'exam',
      });
      tasks.push({
        id: `task_${dateStr}_rev`,
        subject: 'Таҳлили хатоҳо',
        title: 'Баррасии саволҳои душвор ва карточкаҳои такрорӣ',
        durationMinutes: 30,
        completed: false,
        type: 'flashcards',
      });
    } else {
      // Pick 2 subjects per day, prioritizing weak subjects
      const sortedSubs = [...selectedSubjects].sort((a, b) => {
        const score = (s: string) => (ratings[s] === 'weak' ? 3 : ratings[s] === 'medium' ? 2 : 1);
        return score(b) - score(a);
      });

      const sub1 = sortedSubs[(i * 2) % sortedSubs.length] || sortedSubs[0] || 'Химия';
      const sub2 = sortedSubs[(i * 2 + 1) % sortedSubs.length] || sortedSubs[1] || 'Физика';

      tasks.push({
        id: `task_${dateStr}_1`,
        subject: sub1,
        title: `${sub1}: Мутолиаи фасли муҳим ва формулаҳо`,
        durationMinutes: Math.min(60, Math.round(hoursPerDay * 30)),
        completed: false,
        type: 'theory',
      });

      tasks.push({
        id: `task_${dateStr}_cards`,
        subject: sub1,
        title: `Карточкаҳо: Такрори истилоҳот аз ${sub1}`,
        durationMinutes: 15,
        completed: false,
        type: 'flashcards',
      });

      tasks.push({
        id: `task_${dateStr}_2`,
        subject: sub2,
        title: `${sub2}: Ҳалли 20 саволи тестӣ ва масъалаҳо`,
        durationMinutes: Math.min(45, Math.round(hoursPerDay * 25)),
        completed: false,
        type: 'test',
      });
    }

    days.push({
      date: dateStr,
      dayOfWeek: dayName,
      tasks,
    });
  }

  return days;
}
