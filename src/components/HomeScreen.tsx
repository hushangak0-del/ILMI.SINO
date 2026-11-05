import React from 'react';
import { FlaskConical, Dna, Atom, BookOpen, Camera, Sparkles, ArrowRight, Clock, Award, Calculator } from 'lucide-react';
import { SubjectConfig, SubjectId, TopicRecord } from '../types/index.ts';
import { SUBJECTS } from '../utils/studyLogic.ts';

interface HomeScreenProps {
  onSelectSubject: (subjectId: SubjectId, option: string) => void;
  onOpenQuickScan: () => void;
  onOpenProblemSolver: () => void;
  recentTopics: TopicRecord[];
  onOpenTopic: (topic: TopicRecord) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectSubject,
  onOpenQuickScan,
  onOpenProblemSolver,
  recentTopics,
  onOpenTopic,
}) => {
  const getSubjectIcon = (id: SubjectId) => {
    switch (id) {
      case 'chemistry':
        return <FlaskConical className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />;
      case 'biology':
        return <Dna className="w-8 h-8 text-amber-600 dark:text-amber-400" />;
      case 'physics':
        return <Atom className="w-8 h-8 text-sky-600 dark:text-sky-400" />;
      case 'tajik':
        return <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getSubjectGradients = (id: SubjectId) => {
    switch (id) {
      case 'chemistry':
        return {
          cardBg: 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/40',
          badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
        };
      case 'biology':
        return {
          cardBg: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:border-amber-500/40',
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
        };
      case 'physics':
        return {
          cardBg: 'from-sky-500/10 via-sky-500/5 to-transparent border-sky-500/30 dark:border-sky-500/40',
          badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
          btnBg: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-500/20',
        };
      case 'tajik':
        return {
          cardBg: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 dark:border-purple-500/40',
          badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
          btnBg: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20',
        };
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Welcome Greeting & Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-teal-950 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Омодагӣ ба имтиҳонҳои ММТ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Салом! Имрӯз чиро меомӯзем?
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
            Акси саҳифаи китобро бигиред, Илмисино онро сода мефаҳмонад, конспект менависад ва 10 саволи тестӣ омода мекунад.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onOpenQuickScan}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-transform active:scale-95"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>📷 Аксбардории саҳифа</span>
            </button>

            <button
              onClick={onOpenProblemSolver}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-sm backdrop-blur-md transition-transform active:scale-95"
            >
              <Calculator className="w-4 h-4 stroke-[2.5] text-sky-300" />
              <span>🧮 Масъала ҳал кун</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Subjects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Интихоби фан
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Фан ва синф ё фасли дилхоҳро интихоб кунед
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.values(SUBJECTS) as SubjectConfig[]).map((subject) => {
            const style = getSubjectGradients(subject.id);
            return (
              <div
                key={subject.id}
                className={`relative overflow-hidden rounded-3xl p-5 border bg-white dark:bg-slate-900 bg-gradient-to-br ${style.cardBg} transition-all duration-200 hover:shadow-md flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-xs">
                      {getSubjectIcon(subject.id)}
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      ММТ
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {subject.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                    {subject.description}
                  </p>

                  {/* Chips for grade or sub-sections */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {subject.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => onSelectSubject(subject.id, opt)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${style.badgeBg} hover:opacity-80`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onSelectSubject(subject.id, subject.defaultOption)}
                  className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 ${style.btnBg}`}
                >
                  <span>Оғози мавзӯъ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent topics / quick resume */}
      {recentTopics.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Мавзӯъҳои охирин</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {recentTopics.length} сабт
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentTopics.slice(0, 4).map((topic) => {
              const bestScore = topic.testAttempts && topic.testAttempts.length > 0
                ? Math.max(...topic.testAttempts.map((a) => a.percentage))
                : null;
              const sub = SUBJECTS[topic.subjectId];

              return (
                <button
                  key={topic.id}
                  onClick={() => onOpenTopic(topic)}
                  className="text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-sm transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 pr-2 overflow-hidden">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="text-emerald-600 dark:text-emerald-400">{sub?.name || 'Фан'}</span>
                      <span>•</span>
                      <span>{topic.option}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {topic.title}
                    </h4>
                  </div>

                  {bestScore !== null ? (
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 ${
                      bestScore >= 80
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : bestScore >= 60
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      <Award className="w-3.5 h-3.5" />
                      <span>{bestScore}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Бе тест</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
