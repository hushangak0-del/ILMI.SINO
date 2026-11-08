import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Type,
  Key,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Activity,
  Loader2,
  XCircle,
  Cpu,
  Flag,
  Share2,
} from 'lucide-react';
import { AppSettings } from '../types/index.ts';
import { requestSelfTest } from '../services/api.ts';
import { ErrorReportsModal } from './ErrorReportsModal.tsx';
import { getStoredReports } from '../services/storage.ts';
import { inviteFriends } from '../utils/shareUtils.ts';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearAllData: () => void;
  onShowOnboarding?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onClearAllData,
  onShowOnboarding,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>(settings.customApiKey || '');
  const [showKeySaved, setShowKeySaved] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showErrorReportsModal, setShowErrorReportsModal] = useState<boolean>(false);

  // Self-test states
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    activeModel?: string;
    latencyMs?: number;
    checks?: {
      apiKey: boolean;
      modelResponse: boolean;
      jsonOutput: boolean;
      imageRecognition: boolean;
    };
    error?: string;
  } | null>(null);

  const handleRunSelfTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await requestSelfTest();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err.message || 'Хатогӣ ҳангоми санҷиши система.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveApiKey = () => {
    onUpdateSettings({ customApiKey: apiKeyInput.trim() });
    setShowKeySaved(true);
    setTimeout(() => setShowKeySaved(false), 2500);
  };

  const handleFontChange = (size: 'small' | 'medium' | 'large') => {
    onUpdateSettings({ fontSize: size });
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    onUpdateSettings({ theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Танзимот
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Идоракунии намуди зоҳирӣ, андозаи ҳуруф, калиди Gemini API ва санҷиши система
        </p>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Намуди зоҳирӣ (Мавзӯъ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Равшан ё торик барои мутобиқат ба чашм
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              settings.theme === 'light'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Равшан (Light)</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              settings.theme === 'dark'
                ? 'border-emerald-500 bg-emerald-950/80 text-emerald-200 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Торик (Dark)</span>
          </button>
        </div>
      </div>

      {/* Font Size Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Андозаи ҳуруф (Шрифт)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Барои мутолиаи осонтари дарсҳо ва тестҳо
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {(['small', 'medium', 'large'] as const).map((sz) => {
            const labels = { small: 'Хурд', medium: 'Миёна', large: 'Калон' };
            const isSelected = settings.fontSize === sz;

            return (
              <button
                key={sz}
                type="button"
                onClick={() => handleFontChange(sz)}
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                {labels[sz]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gemini API Key Override */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Калиди Gemini API
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Танҳо дар браузери шумо нигоҳ дошта мешавад (ихтиёрӣ)
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AIzaSy... (агар лозим бошад ворид кунед)"
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
          />

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              {settings.customApiKey ? 'Калиди фармоишӣ фаъол аст' : 'Аз калиди дарунсохти сервер истифода мешавад'}
            </p>

            <button
              onClick={handleSaveApiKey}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all active:scale-95"
            >
              Сабти калид
            </button>
          </div>

          {showKeySaved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Калид бомуваффақият сабт шуд!</span>
            </div>
          )}
        </div>
      </div>

      {/* System Self-Test (Санҷиши система) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Санҷиши система (Self-Test)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Санҷиши калиди API, фаъолияти модел, формати JSON ва шинохтани акс
              </p>
            </div>
          </div>

          <button
            onClick={handleRunSelfTest}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Санҷида мешавад...</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5" />
                <span>Санҷиши система</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="font-bold text-slate-900 dark:text-white">
                Ҳолати умумӣ:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  testResult.ok
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {testResult.ok ? 'Фаъол ва омода' : 'Хатогӣ дар пайвастшавӣ'}
              </span>
            </div>

            {testResult.checks && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-medium">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {testResult.checks.apiKey ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>Калиди API: {testResult.checks.apiKey ? 'Фаъол' : 'Нест'}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {testResult.checks.modelResponse ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>Модел: {testResult.activeModel || 'gemini-3.8-flash'}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {testResult.checks.jsonOutput ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>Сохтори JSON: {testResult.checks.jsonOutput ? 'Тасдиқ шуд' : 'Номукаммал'}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {testResult.checks.imageRecognition ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>Шинохтани акс: {testResult.checks.imageRecognition ? 'Санҷида шуд' : 'Хатогӣ'}</span>
                </div>
              </div>
            )}

            {testResult.latencyMs && (
              <div className="text-[11px] text-slate-400 pt-1">
                Суръати посух (Latency): {testResult.latencyMs} мс
              </div>
            )}

            {testResult.error && (
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs">
                {testResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Reports (Ҳисоботи хатоҳо) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Flag className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ҳисоботи хатоҳо
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px]">
                  {getStoredReports().length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Хатогиҳои гузоришшуда бо имкони фиристодан ба Telegram ё нусхабардорӣ
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowErrorReportsModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 shrink-0"
          >
            Дидани гузоришҳо
          </button>
        </div>
      </div>

      {/* Invite Friends (Дӯстонро даъват кун) */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg shadow-emerald-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-200" />
            <h2 className="text-base font-extrabold">Дӯстонро даъват кун</h2>
          </div>
          <p className="text-xs text-emerald-100 max-w-md leading-relaxed">
            Илмисиноро ба ҳамсинфон ва дӯстонатон тавсия диҳед, то онҳо низ ба имтиҳони ММТ омода шаванд!
          </p>
        </div>

        <button
          onClick={() => inviteFriends()}
          className="px-5 py-2.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs shadow-md transition-transform active:scale-95 shrink-0 flex items-center gap-2"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Равона кардан</span>
        </button>
      </div>

      {/* Onboarding Welcome Cards (Муаррифии аввалия) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Муаррифии барнома (Onboarding)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Корти шиносоӣ ва дастури истифодаи Илмисино
              </p>
            </div>
          </div>

          {onShowOnboarding && (
            <button
              onClick={onShowOnboarding}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 shrink-0"
            >
              Дубора нишон деҳ
            </button>
          )}
        </div>
      </div>

      {/* Clear All Data */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Тоза кардани таърих ва маълумот
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ҳамаи мавзӯъҳои захирашуда ва холҳои санҷишҳо тоза мешаванд
            </p>
          </div>
        </div>

        {showClearConfirm ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>Оё мутмаин ҳастед? Ҳамаи мавзӯъҳо ва холҳо бебозгашт тоза карда мешаванд.</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Бале, ҳамаро пок кун
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Бекор кардан
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Тоза кардани таърих</span>
          </button>
        )}
      </div>

      {/* About Section */}
      <div className="p-5 rounded-3xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <span>Дар бораи Илмисино ва имтиҳони ММТ</span>
        </div>
        <p className="leading-relaxed">
          «Илмисино» ёрдамчии бемаҳдуди ҳушманди мактабиён ва довталабони Маркази миллии тестӣ (ММТ)-и назди Президенти Ҷумҳурии Тоҷикистон мебошад. Барнома барои фаҳмонидани содаи фанҳои дақиқ (Химия, Физика, Биология) ва забони тоҷикӣ бо истифодаи модели муосири Gemini тарҳрезӣ шудааст.
        </p>
      </div>

      {/* Error Reports Modal */}
      <ErrorReportsModal
        isOpen={showErrorReportsModal}
        onClose={() => setShowErrorReportsModal(false)}
      />
    </div>
  );
};
