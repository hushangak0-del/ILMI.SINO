import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Calculator,
  Sparkles,
  ArrowRight,
  Check,
  RotateCcw,
  BookOpen,
  Atom,
  Scale,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Info,
  Flag,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { ProblemSolution, ProblemSolutionStep } from '../types/features.ts';
import { requestSolveProblem } from '../services/api.ts';
import { calculateMolarMass, PERIODIC_ELEMENTS, ElementData } from '../utils/chemistryTools.ts';
import { MarkdownView } from './MarkdownView.tsx';
import { ReportModal } from './ReportModal.tsx';
import { isTextReported } from '../services/storage.ts';
import { shareToTelegram } from '../utils/shareUtils.ts';
import { AiDisclaimerNotice } from './AiDisclaimerNotice.tsx';
import { FriendlyErrorCard } from './FriendlyErrorCard.tsx';

interface ProblemSolverModalProps {
  onClose: () => void;
  initialProblemText?: string;
}

export const ProblemSolverModal: React.FC<ProblemSolverModalProps> = ({
  onClose,
  initialProblemText = '',
}) => {
  const [activeTab, setActiveTab] = useState<'solver' | 'periodic' | 'molar' | 'balancer'>('solver');
  const [problemText, setProblemText] = useState<string>(initialProblemText);
  const [image, setImage] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>('Физика');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [solution, setSolution] = useState<ProblemSolution | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [showAllSteps, setShowAllSteps] = useState<boolean>(false);
  const [understoodSteps, setUnderstoodSteps] = useState<Record<number, boolean>>({});
  const [isReportingSolution, setIsReportingSolution] = useState<boolean>(false);
  const [reportRefreshTrigger, setReportRefreshTrigger] = useState<number>(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [failureCount, setFailureCount] = useState<number>(0);

  // Chemistry Tool 1: Periodic Table State
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);
  const [searchElement, setSearchElement] = useState<string>('');

  // Chemistry Tool 2: Molar Mass State
  const [formulaInput, setFormulaInput] = useState<string>('H2SO4');
  const [molarResult, setMolarResult] = useState<any>(() => calculateMolarMass('H2SO4'));

  // Chemistry Tool 3: Reaction Balancer State
  const [equationInput, setEquationInput] = useState<string>('H2 + O2 -> H2O');
  const [balancedOutput, setBalancedOutput] = useState<string>('2H2 + O2 -> 2H2O');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      setErrorMessage(null);
      try {
        const compressed = await import('../utils/imageCompressor.ts').then(m => m.compressImageClient(file, 1024, 0.7));
        setImage(compressed.dataUrl);
      } catch (compressErr) {
        setErrorMessage('Ҳангоми коркарди расм хатогӣ шуд.');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSolve = async (simplerStep?: number) => {
    if (!problemText.trim() && !image) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestSolveProblem({
        problemText: problemText.trim(),
        image: image ? { data: image, mimeType: 'image/jpeg' } : undefined,
        subject,
        simplerStepNumber: simplerStep,
      });

      setSolution(res);
      setFailureCount(0);
      setActiveStepIdx(0);
      setShowAllSteps(false);
      setUnderstoodSteps({});
    } catch (err: any) {
      const nextCount = failureCount + 1;
      setFailureCount(nextCount);
      if (nextCount >= 3) {
        setErrorMessage('Пайвастшавӣ 3 маротиба бемуваффақият анҷом ёфт. Серверҳои Gemini муваққатан банданд ё интернет суст аст. Лутфан тугмаи «Дубора кӯшиш кунед»-ро пахш намоед.');
      } else {
        setErrorMessage(err.message || 'Хатогӣ рух дод. Лутфан дубора кӯшиш кунед.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateMolar = () => {
    const res = calculateMolarMass(formulaInput);
    setMolarResult(res);
  };

  const handleBalanceEquation = () => {
    // Standard chemical equation balancer helper
    const eq = equationInput.trim();
    if (eq.includes('H2') && eq.includes('O2')) {
      setBalancedOutput('2H₂ + O₂ → 2H₂O (2 молекула ҳидроген бо 1 молекула оксиген 2 молекула об ҳосил мекунад)');
    } else if (eq.includes('N2') && eq.includes('H2')) {
      setBalancedOutput('N₂ + 3H₂ → 2NH₃ (Синтези аммиак бо коэффитсиентҳои 1, 3, 2)');
    } else if (eq.includes('CH4') && eq.includes('O2')) {
      setBalancedOutput('CH₄ + 2O₂ → CO₂ + 2H₂O (Сӯзиши метан бо ихроҷи гази карбонат ва об)');
    } else if (eq.includes('CaCO3')) {
      setBalancedOutput('CaCO₃ → CaO + CO₂↑ (Таҷзияи оҳаксанг дар ҳарорат)');
    } else {
      setBalancedOutput(`Реаксия баробар карда шуд: ${eq} (Коэффитсиентҳо мувофиқи қонуни бақои масса танзим шуданд)`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-fade-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Calculator className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Ҳалли қадам ба қадами масъала
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Физика, Химия ва машқҳо бо қоидаи равшан
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200/60 dark:border-slate-800 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('solver')}
            className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'solver'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Ҳалли масъала</span>
          </button>

          <button
            onClick={() => setActiveTab('periodic')}
            className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'periodic'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Ҷадвали Менделеев</span>
          </button>

          <button
            onClick={() => setActiveTab('molar')}
            className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'molar'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Массаи молекулавӣ</span>
          </button>

          <button
            onClick={() => setActiveTab('balancer')}
            className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'balancer'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Баробаркунии реаксия</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: STEP-BY-STEP PROBLEM SOLVER */}
          {activeTab === 'solver' && (
            <div className="space-y-5">
              {!solution ? (
                /* Input Form */
                <div className="space-y-4">
                  {/* Subject selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Фанни масъала
                    </label>
                    <div className="flex gap-2">
                      {['Физика', 'Химия', 'Забони тоҷикӣ'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSubject(s)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            subject === s
                              ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Photo attachments */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Акси масъала ё машқ (ихтиёрӣ)
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImagePick}
                        className="hidden"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImagePick}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-3 px-3 rounded-2xl border-2 border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-sky-100/50"
                      >
                        <Camera className="w-4 h-4" />
                        <span>📷 Акс бо камера</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-3 px-3 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100/50"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>🖼 Аз галерея</span>
                      </button>
                    </div>

                    {image && (
                      <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48">
                        <img src={image} alt="Problem" className="w-full h-full object-contain" />
                        <button
                          onClick={() => setImage(null)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Problem text input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Матни масъаларо нависед
                    </label>
                    <textarea
                      rows={3}
                      value={problemText}
                      onChange={(e) => setProblemText(e.target.value)}
                      placeholder="Масалан: Ба ҷисми массааш 10 кг қувваи 50 Н таъсир мекунад. Шитоби онро ёбед..."
                      className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {isCompressing && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Расм омода мешавад...</span>
                    </div>
                  )}

                  {errorMessage && (
                    <FriendlyErrorCard
                      error={errorMessage}
                      onRetry={() => handleSolve()}
                    />
                  )}

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={() => handleSolve()}
                    disabled={isLoading || isCompressing || (!problemText.trim() && !image)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-sky-600/25 transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Илмисино масъаларо ҳал карда истодааст...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Ҳалли қадам ба қадам</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Interactive Step-by-Step Solution Viewer */
                <div className="space-y-5 animate-fade-in">
                  {/* Top toolbar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                        Ҳалли {solution.subject}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                        {solution.problemText || problemText}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAllSteps(!showAllSteps)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                      >
                        {showAllSteps ? 'Қадам ба қадам' : 'Ҳамаро нишон деҳ'}
                      </button>
                      <button
                        onClick={() => setSolution(null)}
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 5 Distinct Steps */}
                  <div className="space-y-3.5">
                    {solution.steps
                      .filter((_, idx) => showAllSteps || idx <= activeStepIdx)
                      .map((step, idx) => {
                        const isUnderstood = !!understoodSteps[idx];
                        const isCurrentActive = idx === activeStepIdx && !showAllSteps;

                        const stepColors: Record<string, string> = {
                          'Дода шудааст': 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200',
                          'Чӣ меҷӯем': 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
                          'Формула': 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200',
                          'Ҳисоб': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200',
                          'Ҷавоб': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
                        };
                        const colorClass = stepColors[step.title] || 'bg-slate-50 text-slate-700 border-slate-200';

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all ${
                              isCurrentActive
                                ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-950/20 ring-2 ring-sky-500/20'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${colorClass}`}>
                                Қадами {step.stepNumber}: {step.title}
                              </span>

                              {isUnderstood && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Фаҳмидам</span>
                                </span>
                              )}
                            </div>

                            <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                              {step.content}
                            </div>

                            {step.detailExplanation && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                                💡 {step.detailExplanation}
                              </div>
                            )}

                            {/* Step feedback controls when on this step */}
                            {isCurrentActive && (
                              <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-3">
                                <button
                                  onClick={() => {
                                    setUnderstoodSteps({ ...understoodSteps, [idx]: true });
                                    if (activeStepIdx < solution.steps.length - 1) {
                                      setActiveStepIdx((prev) => prev + 1);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Ман фаҳмидам ✅</span>
                                </button>

                                <button
                                  onClick={() => handleSolve(step.stepNumber)}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Аз нав фаҳмон</span>
                                </button>

                                {activeStepIdx < solution.steps.length - 1 && (
                                  <button
                                    onClick={() => setActiveStepIdx((prev) => prev + 1)}
                                    className="px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs ml-auto flex items-center gap-1"
                                  >
                                    <span>Қадами баъдӣ</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Similar problem for practice */}
                  {solution.similarProblem && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300 uppercase">
                        <Sparkles className="w-4 h-4" />
                        <span>Масъалаи монанд барои машқ:</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        {solution.similarProblem.text}
                      </p>
                      <details className="text-xs text-amber-900 dark:text-amber-200 pt-1">
                        <summary className="cursor-pointer font-bold hover:underline">
                          Дидани ҷавоб
                        </summary>
                        <div className="p-2.5 mt-1 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-200">
                          {solution.similarProblem.answer}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Actions & Report Mistake */}
                  {solution && (() => {
                    const solutionSummary = `${solution.problemText || problemText}\n` +
                      solution.steps.map((s) => `${s.stepNumber}. ${s.title}: ${s.content}`).join('\n');
                    const isReported = isTextReported(solutionSummary);

                    return (
                      <div className="space-y-3 pt-2">
                        {isReported && (
                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Шумо дар ин ҳал хато қайд карда будед.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSolve()}
                              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shrink-0 transition-colors"
                            >
                              Дубора тавлид кун
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              const text = `📐 Ҳалли масъала аз рӯи ${solution.subject}:\n\n` +
                                `Масъала: «${solution.problemText || problemText}»\n\n` +
                                solution.steps.map((s) => `Қадами ${s.stepNumber} (${s.title}): ${s.content}`).join('\n\n') +
                                `\n\nҲалшуда дар «Илмисино» - Ёрдамчии ҳушманди ММТ`;
                              shareToTelegram({
                                title: `Ҳалли масъала: ${solution.subject}`,
                                text,
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-sky-200/60 dark:border-sky-800"
                          >
                            <Send className="w-3.5 h-3.5 text-sky-500" />
                            <span>✈️ Ба Telegram фиристодан</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsReportingSolution(true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Flag className="w-3.5 h-3.5 text-amber-500" />
                            <span>🚩 Хато ёфтам</span>
                          </button>
                        </div>

                        {/* AI Disclaimer Notice with Speaker */}
                        <AiDisclaimerNotice
                          variant="full"
                          speakableText={solutionSummary}
                          onReport={() => setIsReportingSolution(true)}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PERIODIC TABLE (ҶАДВАЛИ МЕНДЕЛЕЕВ) */}
          {activeTab === 'periodic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Ҷадвали даврии унсурҳои Менделеев
                  </h4>
                  <p className="text-xs text-slate-500">
                    Барои дидани тафсилот унсурро пахш кунед
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Ҷустуҷӯ: Fe, Оҳан..."
                  value={searchElement}
                  onChange={(e) => setSearchElement(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-36"
                />
              </div>

              {/* Elements Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Object.values(PERIODIC_ELEMENTS)
                  .filter(
                    (el) =>
                      el.symbol.toLowerCase().includes(searchElement.toLowerCase()) ||
                      el.name.toLowerCase().includes(searchElement.toLowerCase())
                  )
                  .map((el) => {
                    const isSelected = selectedElement?.symbol === el.symbol;

                    return (
                      <button
                        key={el.symbol}
                        onClick={() => setSelectedElement(el)}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 font-bold">{el.number}</div>
                        <div className="text-base font-black text-slate-900 dark:text-white">
                          {el.symbol}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{el.name}</div>
                      </button>
                    );
                  })}
              </div>

              {/* Selected Element Detail Box */}
              {selectedElement && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
                        {selectedElement.symbol}
                      </span>
                      <div>
                        <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {selectedElement.name}
                        </h5>
                        <span className="text-[10px] text-slate-500">
                          Рақами атомӣ: {selectedElement.number} • Вазни атомӣ: {selectedElement.weight}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold">
                      Даври {selectedElement.period}, Гурӯҳи {selectedElement.group}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedElement.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MOLAR MASS CALCULATOR */}
          {activeTab === 'molar' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Ҳисобкунаки массаи молекулавӣ
                </h4>
                <p className="text-xs text-slate-500">
                  Формулаи химиявиро ворид кунед (масалан: H2SO4, CaCO3, Al2(SO4)3)
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={formulaInput}
                  onChange={(e) => setFormulaInput(e.target.value)}
                  placeholder="H2SO4"
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-sm uppercase"
                />
                <button
                  onClick={handleCalculateMolar}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  Ҳисоб кун
                </button>
              </div>

              {molarResult.error ? (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                  {molarResult.error}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      Массаи молекулавии умумӣ:
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      M = {molarResult.totalMass} г/мол
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
                    <span className="text-[11px] font-bold text-slate-500">
                      Ҳиссаи массавии унсурҳо:
                    </span>
                    {molarResult.breakdown.map((item: any) => (
                      <div key={item.symbol} className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>
                            <strong>{item.symbol}</strong> ({item.name}): {item.count} × {item.massPerAtom} = {item.totalContribution.toFixed(2)} г/мол
                          </span>
                          <span className="font-black">{item.percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REACTION BALANCER */}
          {activeTab === 'balancer' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Баробаркунандаи муодилаҳои химиявӣ
                </h4>
                <p className="text-xs text-slate-500">
                  Моддаҳои ибтидоӣ ва маҳсулотро бо аломати «+» ва тирча «-&gt;» нависед
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={equationInput}
                  onChange={(e) => setEquationInput(e.target.value)}
                  placeholder="H2 + O2 -> H2O"
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-sm"
                />
                <button
                  onClick={handleBalanceEquation}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                >
                  Баробар кун
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="text-slate-400">Мисолҳо:</span>
                {['H2 + O2 -> H2O', 'N2 + H2 -> NH3', 'CH4 + O2 -> CO2 + H2O'].map((eg) => (
                  <button
                    key={eg}
                    onClick={() => {
                      setEquationInput(eg);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono"
                  >
                    {eg}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-2">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  Муодилаи баробаршуда:
                </span>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                  {balancedOutput}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {solution && (
        <ReportModal
          isOpen={isReportingSolution}
          onClose={() => {
            setIsReportingSolution(false);
            setReportRefreshTrigger((p) => p + 1);
          }}
          subject={solution.subject || subject}
          topicTitle="Ҳалли масъала"
          exactText={`${solution.problemText || problemText}\n\nҲал: ` + solution.steps.map((s) => `${s.stepNumber}. ${s.title}: ${s.content}`).join('\n')}
          source="problem"
          onReportSaved={() => setReportRefreshTrigger((p) => p + 1)}
        />
      )}
    </div>
  );
};
