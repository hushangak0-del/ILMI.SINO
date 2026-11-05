import React from 'react';
import { Home, Layers, Award, Calendar, History, TrendingUp } from 'lucide-react';

export type MainTab = 'home' | 'cards' | 'exam' | 'plan' | 'history' | 'progress' | 'settings';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  dueCardsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, dueCardsCount = 0 }) => {
  const tabs = [
    { id: 'home' as MainTab, label: 'Асосӣ', icon: Home },
    { id: 'cards' as MainTab, label: 'Карточкаҳо', icon: Layers, badge: dueCardsCount > 0 ? dueCardsCount : undefined },
    { id: 'exam' as MainTab, label: 'Имтиҳон', icon: Award },
    { id: 'plan' as MainTab, label: 'Нақша', icon: Calendar },
    { id: 'history' as MainTab, label: 'Таърих', icon: History },
    { id: 'progress' as MainTab, label: 'Пешрафт', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors pb-safe">
      <div className="max-w-xl mx-auto px-2 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-xl relative transition-all ${
                  isActive ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] mt-0.5 truncate max-w-[54px] sm:max-w-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
