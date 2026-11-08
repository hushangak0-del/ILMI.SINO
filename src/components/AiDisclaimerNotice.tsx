import React, { useState } from 'react';
import { Flag, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/speechUtils.ts';

export type DisclaimerVariant = 'full' | 'short' | 'examResult';

interface AiDisclaimerNoticeProps {
  variant?: DisclaimerVariant;
  onReport?: () => void;
  reportLabel?: string;
  speakableText?: string;
  className?: string;
}

export const AiDisclaimerNotice: React.FC<AiDisclaimerNoticeProps> = ({
  variant = 'full',
  onReport,
  reportLabel = 'Хато ёфтам',
  speakableText,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const getNoticeText = () => {
    switch (variant) {
      case 'short':
        return 'Бо китоб санҷед.';
      case 'examResult':
        return 'Ҷавобҳои ИИ-ро бо муаллим ё китоб санҷед.';
      case 'full':
      default:
        return 'Илмисино метавонад хато кунад. Ҳатман бо китоби дарсӣ муқоиса кунед.';
    }
  };

  const handleToggleSpeak = () => {
    if (!speakableText) return;

    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const success = speakText(
        speakableText,
        () => setIsPlaying(true),
        () => setIsPlaying(false),
        () => setIsPlaying(false)
      );
      if (!success) {
        setIsPlaying(false);
      }
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 ${className}`}
    >
      {/* Calm, small disclaimer notice */}
      <div className="flex items-center gap-1.5 leading-snug">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
        <span className="select-none">{getNoticeText()}</span>
      </div>

      {/* Buttons: Speaker & Report Flag sitting next to each other */}
      <div className="flex items-center gap-2 shrink-0">
        {speakableText && (
          <button
            type="button"
            onClick={handleToggleSpeak}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
              isPlaying
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse'
                : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isPlaying ? 'Қатъ кардани овоз' : 'Бо овоз хондан'}
          >
            {isPlaying ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Қатъ</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>🔊 Бо овоз хон</span>
              </>
            )}
          </button>
        )}

        {onReport && (
          <button
            type="button"
            onClick={onReport}
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 flex items-center gap-1 transition-colors"
          >
            <Flag className="w-3 h-3 text-amber-500" />
            <span>🚩 {reportLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
