import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Bell,
  AlertCircle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Award,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { StudyPlan, StudyPlanDay } from '../types/features.ts';
import { calculateDaysRemaining, generateInitialSchedule } from '../utils/studyPlanLogic.ts';
import { saveStoredStudyPlan } from '../services/storage.ts';
import { requestStudyPlan } from '../services/api.ts';

interface StudyPlanScreenProps {
  plan: StudyPlan | null;
  onUpdatePlan: (updated: StudyPlan) => void;
  weakTopicsTitles: string[];
  onStartSundayExam: () => void;
  onTaskCompleted: () => void;
}

export const StudyPlanScreen: React.FC<StudyPlanScreenProps> = ({
  plan,
  onUpdatePlan,
  weakTopicsTitles,
  onStartSundayExam,
  onTaskCompleted,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(!plan);
  const [examDate, setExamDate] = useState<string>(
    plan?.examDate || new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0]
  );
  const [hoursPerDay, setHoursPerDay] = useState<number>(plan?.hoursPerDay || 2);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    plan?.selectedSubjects || ['Химия', 'Биология', 'Физика', 'Забони тоҷикӣ']
  );
  const [ratings, setRatings] = useState<Record<string, 'weak' | 'medium' | 'strong'>>(
    plan?.ratings || {
      Химия: 'medium',
      Биология: 'strong',
      Физика: 'weak',
      'Забони тоҷикӣ': 'medium',
    }
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'today' | 'calendar'>('today');
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);

  const daysRemaining = calculateDaysRemaining(plan?.examDate || examDate);

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    try {
      const generatedDays = generateInitialSchedule(examDate, hoursPerDay, selectedSubjects, ratings);

      const newPlan: StudyPlan = {
        id: 'plan_' + Date.now().toString(36),
        examDate,
        hoursPerDay,
        selectedSubjects,
        ratings,
        days: generatedDays,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      onUpdatePlan(newPlan);
      saveStoredStudyPlan(newPlan);
      setIsEditing(false);
    } catch (e) {
      alert('Хатогӣ ҳангоми сохтани нақша.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = (dayIdx: number, taskId: string) => {
    if (!plan) return;
    const updatedDays = [...plan.days];
    const task = updatedDays[dayIdx].tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      if (task.completed) {
        onTaskCompleted();
      }
    }
    const updatedPlan = { ...plan, days: updatedDays, lastUpdated: new Date().toISOString() };
    onUpdatePlan(updatedPlan);
    saveStoredStudyPlan(updatedPlan);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotificationEnabled(true);
        new Notification('Илмисино', {
          body: 'Ёдраскуниҳо фаъол шуданд! Ҳар рӯз барои омодагӣ ба шумо хабар медиҳем.',
        });
      }
    }
  };

  // Today's tasks (day 0)
  const todayPlan = plan?.days?.[0];

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Top Countdown Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-950 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-300">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Ҳисоби рӯзҳои боқимонда то имтиҳон</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">
            Ба ММТ боқӣ мондааст: {daysRemaining} рӯз
          </h2>
          <p className="text-xs text-slate-300">
            Санаи имтиҳон: {new Date(plan?.examDate || examDate).toLocaleDateString('tg-TJ', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all shrink-0"
        >
          {isEditing ? 'Бастан' : 'Тағйири нақша'}
        </button>
      </div>

      {/* Setup / Editing Mode Form */}
      {isEditing ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 animate-fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Танзими нақшаи шахсии омодагӣ
            </h3>
            <p className="text-xs text-slate-500">
              Барномаи таълимӣ мувофиқи холҳо ва фанҳои заифи шумо тартиб дода мешавад
            </p>
          </div>

          {/* Exam Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Санаи имтиҳони ММТ
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
            />
          </div>

          {/* Hours per day */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500 uppercase">Соатҳои дастрас дар як рӯз</span>
              <span className="text-emerald-600 font-black">{hoursPerDay} соат</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>1 соат</span>
              <span>3 соат</span>
              <span>6 соат</span>
            </div>
          </div>

          {/* Subject Ratings */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Баҳодиҳии шахсӣ ба ҳар як фан (Барои тақсими вақт)
            </label>
            <div className="space-y-2">
              {['Химия', 'Биология', 'Физика', 'Забони тоҷикӣ'].map((sub) => (
                <div
                  key={sub}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{sub}</span>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'weak', label: 'Заиф (Вақти бештар)', color: 'rose' },
                      { id: 'medium', label: 'Миёна', color: 'amber' },
                      { id: 'strong', label: 'Қавӣ', color: 'emerald' },
                    ].map((opt) => {
                      const isSel = ratings[sub] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRatings({ ...ratings, [sub]: opt.id as any })}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                            isSel
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleGeneratePlan}
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/25 transition-transform active:scale-95"
          >
            {isLoading ? 'Илмисино нақшаро месозад...' : 'Сохтани нақшаи мукаммал'}
          </button>
        </div>
      ) : (
        /* Plan Views: Today vs Calendar */
        <div className="space-y-5 animate-fade-in">
          {/* Gentle encouragement banner if days were missed */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
            <span className="text-xl">🌿</span>
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                Ҳар рӯз қадаме ба сӯи донишгоҳ!
              </span>
              <p className="text-emerald-700 dark:text-emerald-300">
                Ҳатто агар як рӯзро аз даст дода бошед ҳам, ҳеҷ боке нест. Муҳим пайвастагӣ ва хоҳиши омӯзиш аст.
              </p>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('today')}
                className={`py-2 px-3 rounded-xl transition-all ${
                  activeTab === 'today'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Супоришҳои имрӯз
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-2 px-3 rounded-xl transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ҷадвали рӯзҳо
              </button>
            </div>

            {/* Notification reminder toggle */}
            {!notificationEnabled && (
              <button
                onClick={requestNotificationPermission}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Фаъолсозии ёдраскунӣ</span>
              </button>
            )}
          </div>

          {/* VIEW 1: TODAY'S TASKS CHECKLIST */}
          {activeTab === 'today' && todayPlan && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Барномаи имрӯз ({todayPlan.dayOfWeek})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Супоришҳои иҷрошуда ба рӯзҳои пай дар пайи шумо (Streak) илова мешаванд
                  </p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {todayPlan.tasks.filter((t) => t.completed).length} / {todayPlan.tasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {todayPlan.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(0, task.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      task.completed
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 opacity-70'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          task.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {task.completed && <CheckCircle2 className="w-4 h-4" />}
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {task.subject} • {task.durationMinutes} дақиқа
                        </span>
                        <h4
                          className={`text-xs sm:text-sm font-bold ${
                            task.completed
                              ? 'line-through text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h4>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400 shrink-0 font-medium">
                      {task.type === 'exam' ? '📝 Имтиҳон' : task.type === 'flashcards' ? '🃏 Карточка' : '📖 Дарс'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 2: CALENDAR VIEW */}
          {activeTab === 'calendar' && plan && (
            <div className="space-y-3">
              {plan.days.map((day, dIdx) => (
                <div
                  key={day.date}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {day.dayOfWeek}
                      </span>
                      <span className="text-[11px] text-slate-400">({day.date})</span>
                      {dIdx === 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Имрӯз
                        </span>
                      )}
                    </div>

                    {day.dayOfWeek === 'Якшанбе' && (
                      <button
                        onClick={onStartSundayExam}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs"
                      >
                        Оғози санҷиши ҳафтаина
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {day.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(dIdx, task.id)}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 cursor-pointer"
                      >
                        <span
                          className={`font-semibold ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-[10px] text-slate-400">{task.durationMinutes} дақ</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
