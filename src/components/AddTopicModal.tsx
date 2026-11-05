import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  ArrowLeft,
  BookOpen,
  AlertCircle,
  Loader2,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { SubjectId, TopicRecord } from '../types/index.ts';
import { SAMPLE_TOPICS, SUBJECTS } from '../utils/studyLogic.ts';
import { compressImageClient } from '../utils/imageCompressor.ts';
import { requestOcr } from '../services/api.ts';
import { saveTopic } from '../services/storage.ts';

interface AddTopicModalProps {
  initialSubjectId: SubjectId;
  initialOption: string;
  onClose: () => void;
  onTopicCreated: (topic: TopicRecord) => void;
}

export const AddTopicModal: React.FC<AddTopicModalProps> = ({
  initialSubjectId,
  initialOption,
  onClose,
  onTopicCreated,
}) => {
  const [subjectId, setSubjectId] = useState<SubjectId>(initialSubjectId);
  const [option, setOption] = useState<string>(initialOption);
  const [topicName, setTopicName] = useState<string>('');
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [images, setImages] = useState<{ id: string; data: string; mimeType: string; sizeKb: number }[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('Илмисино саҳифаро мехонад...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const currentSubject = SUBJECTS[subjectId];

  // Handle files selection with client-side compression
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const maxPhotos = 10;
    const remainingSlots = maxPhotos - images.length;
    if (remainingSlots <= 0) {
      setErrorMessage('Ҳадди аксар то 10 саҳифаро дар як вақт илова кардан мумкин аст.');
      return;
    }

    const filesToRead = Array.from(files).slice(0, remainingSlots);
    setIsCompressing(true);

    try {
      for (const file of filesToRead) {
        if (!file.type.startsWith('image/')) {
          setErrorMessage('Танҳо файлҳои расмӣ (JPG, PNG, WEBP) қабул карда мешаванд.');
          continue;
        }

        // Compress image on client down to max 1280px and quality 0.8 (<500KB)
        const compressed = await compressImageClient(file, 1280, 0.8);
        const sizeKb = Math.round(compressed.sizeBytes / 1024);

        setImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            data: compressed.dataUrl,
            mimeType: 'image/jpeg',
            sizeKb,
          },
        ]);
      }
    } catch (compressErr) {
      console.error('Image compression error:', compressErr);
      setErrorMessage('Ҳангоми коркарди расм хатогӣ рух дод.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSelectSample = (sample: (typeof SAMPLE_TOPICS)[0]) => {
    setSubjectId(sample.subjectId);
    setOption(sample.option);
    setTopicName(sample.title);
    setUserQuestion('');
    setImages([]);
    setErrorMessage(null);
  };

  const cancelLoading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setLoadingStep('');
  };

  const handleStart = async () => {
    if (images.length === 0 && !topicName.trim() && !userQuestion.trim()) {
      setErrorMessage('Лутфан аксбардорӣ кунед, расми саҳифаро интихоб кунед ё номи мавзӯъро нависед.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep('Расм фиристода мешавад...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep('Илмисино саҳифаро мехонад...');
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep('Формулаҳо ва шарҳи масъала таҳия мешавад...');
      }, 3000);

      // Check if this topic matches one of the sample topics without image
      const matchedSample = SAMPLE_TOPICS.find(
        (s) => s.title.toLowerCase().trim() === topicName.toLowerCase().trim()
      );

      let result: { title: string; text: string };

      if (images.length === 0 && matchedSample && !userQuestion.trim()) {
        // Fast path for built-in samples if no image
        result = {
          title: matchedSample.title,
          text: matchedSample.sampleText,
        };
      } else {
        result = await requestOcr(
          {
            images: images.map((img) => ({ data: img.data, mimeType: img.mimeType })),
            topicName: topicName.trim(),
            userQuestion: userQuestion.trim(),
            subject: currentSubject.name,
            option: option,
          },
          abortController.signal
        );
      }

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const newTopic: TopicRecord = {
        id: 'topic_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        title: result.title || topicName.trim() || userQuestion.trim() || 'Мавзӯи нав',
        subjectId: subjectId,
        option: option,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cleanText: result.text,
        testAttempts: [],
        images: images.slice(0, 3).map((img) => img.data),
      };

      saveTopic(newTopic);
      setIsLoading(false);
      onTopicCreated(newTopic);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('User cancelled OCR request');
        return;
      }
      console.error('Error reading topic:', err);
      setIsLoading(false);
      // Keep images and topicName intact so user does not lose input
      setErrorMessage(err.message || 'Хатогӣ рух дод. Лутфан тугмаи «Дубора кӯшиш кунед»-ро пахш намоед.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto transition-all">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={isLoading ? cancelLoading : onClose}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Илова кардани мавзӯъ
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {currentSubject.name}
              </span>
              <span>•</span>
              <span>{option}</span>
            </div>
          </div>
          <button
            onClick={isLoading ? cancelLoading : onClose}
            className="p-2 -mr-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Subject & Sub-grade picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Фан ва синф
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(SUBJECTS) as SubjectId[]).map((sId) => {
                const sub = SUBJECTS[sId];
                return (
                  <button
                    key={sId}
                    type="button"
                    onClick={() => {
                      setSubjectId(sId);
                      setOption(sub.defaultOption);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                      sId === subjectId
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>

            {/* Option chips for current subject */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentSubject.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setOption(opt)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-all ${
                    opt === option
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Action Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Саҳифаи китобро бор кунед
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Hidden camera input */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isLoading || isCompressing}
                className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 transition-colors flex flex-col items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 group"
              >
                <div className="p-3 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="font-bold text-xs sm:text-sm">📷 Аксбардорӣ</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 text-center">Бо камераи телефон</span>
              </button>

              {/* Hidden gallery input */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isLoading || isCompressing}
                className="p-4 rounded-2xl border-2 border-dashed border-indigo-500/40 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 transition-colors flex flex-col items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300 group"
              >
                <div className="p-3 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="font-bold text-xs sm:text-sm">🖼 Аз галерея</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 text-center">То 10 саҳифа</span>
              </button>
            </div>
          </div>

          {/* Compression banner */}
          {isCompressing && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>Расм омода мешавад (фишурдасозӣ ва беҳбуди суръат)...</span>
            </div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Аксҳои интихобшуда ({images.length}/10):</span>
                <button
                  type="button"
                  onClick={() => setImages([])}
                  className="text-rose-500 hover:underline"
                >
                  Ҳамаро тоза кун
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden aspect-3/4 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={img.data}
                      alt={`Саҳифаи ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                      #{idx + 1}
                    </div>
                    {img.sizeKb > 0 && (
                      <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[9px] text-white">
                        {img.sizeKb} KB
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-transform active:scale-90"
                      aria-label="Нест кардан"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User question alongside photo */}
          {images.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Саволи шумо дар бораи ин саҳифа (ихтиёрӣ):</span>
              </label>
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Масалан: Масъалаи 4-ро ҳал кунед ё формуларо шарҳ диҳед..."
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm transition-all"
              />
            </div>
          )}

          {/* Text input alternative */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {images.length > 0 ? 'Ё номи мавзӯъро тағйир диҳед' : 'Ё номи мавзӯъро нависед'}
            </label>
            <input
              type="text"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="Масалан: Қонуни дуюми Нютон, Сохти ҳуҷайра..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
            />
          </div>

          {/* Quick Preloaded Samples */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Намунаҳои китоб барои санҷиш (бе акс):</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TOPICS.map((samp) => (
                <button
                  key={samp.title}
                  type="button"
                  onClick={() => handleSelectSample(samp)}
                  className="text-xs py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 transition-colors border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700"
                >
                  {samp.title}
                </button>
              ))}
            </div>
          </div>

          {/* Error message with retry */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">{errorMessage}</div>
              </div>
              <button
                type="button"
                onClick={handleStart}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Дубора кӯшиш кунед</span>
              </button>
            </div>
          )}

          {/* Loading Animation with Cancel button */}
          {isLoading && (
            <div className="p-6 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/30 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                {loadingStep}
              </h3>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400 max-w-xs mx-auto">
                Илмисино матн, формулаҳо ва ҳалли масъаларо бо модели тезкор таҳлил мекунад.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={cancelLoading}
                  className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Бекор кардан
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Start Button */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
          <button
            type="button"
            onClick={isLoading ? cancelLoading : onClose}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isLoading ? 'Бекор кардан' : 'Ба қафо'}
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading || isCompressing || (images.length === 0 && !topicName.trim() && !userQuestion.trim())}
            className="flex-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Интизор шавед...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Оғоз кун</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
