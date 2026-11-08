import React, { useState, useRef } from 'react';
import { Camera, Lightbulb, CheckCircle2, ChevronRight, ChevronLeft, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ONBOARDING_STORAGE_KEY = 'ilmisino_onboarding_completed_v1';

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch (e) {
    console.error(e);
  }
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);

  if (!isOpen) return null;

  const cards = [
    {
      id: 1,
      badge: 'Қадами 1 аз 3',
      icon: <Camera className="w-16 h-16 text-emerald-500 animate-bounce" />,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
      title: '📷 Саҳифаи китобро аксбардорӣ кунед',
      description: 'Илмисино матнро мехонад.',
      detail: 'Китоби дарсӣ ё дафтари худро сурат гиред. Формулаҳо ва расмҳо ба таври худкор шинохта мешаванд.',
    },
    {
      id: 2,
      badge: 'Қадами 2 аз 3',
      icon: <Lightbulb className="w-16 h-16 text-amber-500 animate-pulse" />,
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
      title: '💡 Шарҳи содда гиред',
      description: 'Фаҳмонда медиҳад, хулоса менависад ва карточка месозад.',
      detail: 'Бо мисолҳои оддии рӯзгор, конспекти мухтасар барои дафтар ва 12 карточка бо расмҳои таълимӣ.',
    },
    {
      id: 3,
      badge: 'Қадами 3 аз 3',
      icon: <CheckCircle2 className="w-16 h-16 text-sky-500" />,
      iconBg: 'bg-sky-500/10 border-sky-500/20 text-sky-600',
      title: '✅ Тест ҳал кунед',
      description: '10 савол аз ҳар мавзӯъ, бешумор.',
      detail: 'Саволҳои чорҷавобаи сабки Маркази миллии тестӣ (ММТ) барои санҷиши сатҳи дониши шумо.',
    },
  ];

  const current = cards[currentStep];

  const handleNext = () => {
    if (currentStep < cards.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    setOnboardingCompleted();
    onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff < -50) {
      // Swiped left -> next
      handleNext();
    } else if (diff > 50) {
      // Swiped right -> prev
      handlePrev();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between min-h-[520px] p-6 sm:p-8 animate-fade-in relative"
      >
        {/* Top bar: skip button */}
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {current.badge}
          </span>
          <button
            type="button"
            onClick={handleFinish}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Гузашта равем
          </button>
        </div>

        {/* Center illustration & copy */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-4">
          <div
            className={`w-28 h-28 rounded-3xl border flex items-center justify-center shadow-inner transition-transform hover:scale-105 ${current.iconBg}`}
          >
            {current.icon}
          </div>

          <div className="space-y-2 max-w-xs">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {current.title}
            </h2>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {current.description}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              {current.detail}
            </p>
          </div>
        </div>

        {/* Bottom controls & indicator dots */}
        <div className="space-y-5 pt-4">
          {/* Step dots */}
          <div className="flex items-center justify-center gap-2">
            {cards.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Ба қадами ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-8 bg-emerald-500 shadow-xs shadow-emerald-500/50'
                    : 'w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Ба қафо"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{currentStep === cards.length - 1 ? 'Оғоз кунем!' : 'Баъдӣ'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
