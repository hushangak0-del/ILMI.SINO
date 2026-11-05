import React from 'react';
import {
  Flame,
  CheckCircle,
  BookOpen,
  Award,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  FlaskConical,
  Dna,
  Atom,
  HelpCircle,
} from 'lucide-react';
import { SubjectId, TopicRecord } from '../types/index.ts';
import { calculateUserStats, SUBJECTS } from '../utils/studyLogic.ts';

interface ProgressScreenProps {
  topics: TopicRecord[];
  onOpenTopicForRepeat: (topic: TopicRecord) => void;
  onExploreMore: () => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  topics,
  onOpenTopicForRepeat,
  onExploreMore,
}) => {
  const stats = calculateUserStats(topics);

  // Collect test history data points for score over time chart
  const timelinePoints: { date: string; percentage: number; title: string }[] = [];
  topics.forEach((t) => {
    (t.testAttempts || []).forEach((att) => {
      timelinePoints.push({
        date: att.date ? att.date.split('T')[0] : '',
        percentage: att.percentage,
        title: t.title,
      });
    });
  });

  // Sort timeline chronologically
  timelinePoints.sort((a, b) => (a.date > b.date ? 1 : -1));
  const recentTimeline = timelinePoints.slice(-10); // Last 10 attempts

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Пешрафт ва омори шумо
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Натиҷаҳои санҷишҳо ва омодагӣ ба имтиҳони ММТ
        </p>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Streak card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Пай дар пай
            </span>
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.streakDays} <span className="text-xs font-bold text-slate-500">рӯз</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">🔥 Рӯзҳои пай дар пай</p>
        </div>

        {/* Topics studied */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Мавзӯъҳо
            </span>
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.topicsCount}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Саҳифаҳои омӯхташуда</p>
        </div>

        {/* Tests completed */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/30 dark:border-indigo-500/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Тестҳо
            </span>
            <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.testsCompletedCount}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Санҷишҳои супорида</p>
        </div>

        {/* Average score */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/30 dark:border-purple-500/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              Холҳои миёна
            </span>
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.overallAverageScore}%
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Дараҷаи умумии саҳеҳӣ</p>
        </div>
      </div>

      {/* Weak topics (<60%) section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Мавзӯъҳои заиф (Зери 60%)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Мавзӯъҳое, ки барои имтиҳони ММТ такрори иловагӣ мехоҳанд
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {stats.weakTopics.length} мавзӯъ
          </span>
        </div>

        {stats.weakTopics.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center text-xs text-emerald-800 dark:text-emerald-300 font-bold">
            🎉 Офарин! Ҳеҷ мавзӯи заиф зери 60% вуҷуд надорад. Шумо омодагии олӣ доред!
          </div>
        ) : (
          <div className="space-y-2.5">
            {stats.weakTopics.map((item) => {
              const fullTopic = topics.find((t) => t.id === item.id);
              const sub = SUBJECTS[item.subjectId];

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase">
                      {sub?.name || 'Фан'} • Хол: {item.score}%
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                  </div>

                  {fullTopic && (
                    <button
                      onClick={() => onOpenTopicForRepeat(fullTopic)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Такрор кун</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Line Chart: Test Scores Over Time */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Динамикаи холҳо бо гузашти вақт
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10 санҷиши охирини анҷомёфта
              </p>
            </div>
          </div>
        </div>

        {recentTimeline.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Барои намоиши график ҳадди аққал як тест бояд супорида шавад.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Interactive SVG Line Chart */}
            <div className="h-44 sm:h-52 w-full pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 140">
                {/* Horizontal grid lines */}
                <line x1="20" y1="20" x2="380" y2="20" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                <line x1="20" y1="70" x2="380" y2="70" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                <line x1="20" y1="120" x2="380" y2="120" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x="5" y="24" className="text-[9px] fill-slate-400 font-bold">100%</text>
                <text x="10" y="74" className="text-[9px] fill-slate-400 font-bold">50%</text>
                <text x="15" y="124" className="text-[9px] fill-slate-400 font-bold">0%</text>

                {/* Plot points */}
                {(() => {
                  const xStep = recentTimeline.length > 1 ? 340 / (recentTimeline.length - 1) : 170;
                  const points = recentTimeline.map((pt, i) => {
                    const x = 30 + i * xStep;
                    // y: 100% -> 20, 0% -> 120
                    const y = 120 - (pt.percentage / 100) * 100;
                    return { x, y, pt };
                  });

                  const pathStr = points.reduce((acc, curr, idx) => {
                    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
                  }, '');

                  return (
                    <>
                      {/* Line */}
                      <path
                        d={pathStr}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Dots and Labels */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            className="fill-white dark:fill-slate-900 stroke-emerald-500"
                            strokeWidth="2.5"
                          />
                          <text
                            x={p.x}
                            y={p.y - 8}
                            textAnchor="middle"
                            className="text-[9px] font-black fill-slate-700 dark:fill-slate-200"
                          >
                            {p.pt.percentage}%
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Average Score Per Subject (Bar Chart) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Холҳои миёна аз рӯи фанҳо
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Муқоисаи дараҷаи омодагӣ аз ҳар як фан
          </p>
        </div>

        <div className="space-y-3.5">
          {(Object.keys(SUBJECTS) as SubjectId[]).map((sId) => {
            const sub = SUBJECTS[sId];
            const avgData = stats.subjectAverages[sId];
            const score = avgData ? avgData.avg : 0;
            const count = avgData ? avgData.testCount : 0;

            let barColor = 'bg-emerald-500';
            if (sId === 'chemistry') barColor = 'bg-emerald-500';
            if (sId === 'biology') barColor = 'bg-amber-500';
            if (sId === 'physics') barColor = 'bg-sky-500';
            if (sId === 'tajik') barColor = 'bg-purple-500';

            return (
              <div key={sId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{sub.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({count} тест)
                    </span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-black">{score}%</span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(4, score)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
