import React, { useState } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Calendar,
  Award,
  BookOpen,
  ArrowRight,
  AlertCircle,
  FlaskConical,
  Dna,
  Atom,
} from 'lucide-react';
import { SubjectId, TopicRecord } from '../types/index.ts';
import { SUBJECTS } from '../utils/studyLogic.ts';

interface HistoryScreenProps {
  topics: TopicRecord[];
  onOpenTopic: (topic: TopicRecord) => void;
  onDeleteTopic: (id: string) => void;
  onNewTopic: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  topics,
  onOpenTopic,
  onDeleteTopic,
  onNewTopic,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredTopics = topics.filter((t) => {
    const matchesSubject = selectedSubject === 'all' || t.subjectId === selectedSubject;
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cleanText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.option.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const getSubjectIcon = (id: SubjectId) => {
    switch (id) {
      case 'chemistry':
        return <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'biology':
        return <Dna className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'physics':
        return <Atom className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'tajik':
        return <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('tg-TJ', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-4xl mx-auto">
      {/* Top Title & Quick Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Таърихи омӯзиш
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ҳамаи мавзӯъҳои сабтшуда ва холҳои санҷишӣ
          </p>
        </div>

        <button
          onClick={onNewTopic}
          className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-transform active:scale-95"
        >
          + Мавзӯи нав
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ҷустуҷӯ аз рӯи номи мавзӯъ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Тоза
            </button>
          )}
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSubject === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Ҳама ({topics.length})
          </button>

          {(Object.keys(SUBJECTS) as SubjectId[]).map((sId) => {
            const sub = SUBJECTS[sId];
            const count = topics.filter((t) => t.subjectId === sId).length;
            const isSelected = selectedSubject === sId;

            return (
              <button
                key={sId}
                onClick={() => setSelectedSubject(sId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{sub.name}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Ҳеҷ мавзӯъе ёфт нашуд
          </p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchTerm
              ? 'Бо ин калима ягон сабт ёфт нашуд. Калимаи дигарро санҷед.'
              : 'Шумо то ҳол ягон мавзӯъро сабт накардаед.'}
          </p>
          <button
            onClick={onNewTopic}
            className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold"
          >
            Илова кардани мавзӯи аввалин
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTopics.map((topic) => {
            const sub = SUBJECTS[topic.subjectId];
            const bestScore =
              topic.testAttempts && topic.testAttempts.length > 0
                ? Math.max(...topic.testAttempts.map((a) => a.percentage))
                : null;
            const isConfirming = deleteConfirmId === topic.id;

            return (
              <div
                key={topic.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex items-center justify-between gap-3 group"
              >
                {/* Clickable Area to reopen topic */}
                <div
                  onClick={() => onOpenTopic(topic)}
                  className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
                    {getSubjectIcon(topic.subjectId)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className={sub.accentColor}>{sub.name}</span>
                      <span>•</span>
                      <span>{topic.option}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(topic.createdAt)}</span>
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {topic.title}
                    </h3>
                  </div>
                </div>

                {/* Score & Delete button */}
                <div className="flex items-center gap-2 shrink-0">
                  {bestScore !== null ? (
                    <div
                      title={`Беҳтарин натиҷа: ${bestScore}%`}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                        bestScore >= 80
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : bestScore >= 60
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{bestScore}%</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                      Бе тест
                    </span>
                  )}

                  {isConfirming ? (
                    <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-xl border border-rose-200 dark:border-rose-900">
                      <button
                        onClick={() => {
                          onDeleteTopic(topic.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700"
                      >
                        Ҳа, пок кун
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded-lg text-slate-500 font-bold text-[10px] hover:bg-slate-200"
                      >
                        Не
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(topic.id)}
                      title="Нест кардани сабт"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
