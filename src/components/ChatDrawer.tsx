import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Bot,
  User,
  Loader2,
  Trash2,
  Calculator,
  Flag,
  AlertTriangle,
  RefreshCw,
  Mic,
  MicOff,
} from 'lucide-react';
import { ChatMessage, TopicRecord } from '../types/index.ts';
import { requestChatReply } from '../services/api.ts';
import { isTextReported } from '../services/storage.ts';
import { MarkdownView } from './MarkdownView.tsx';
import { ReportModal } from './ReportModal.tsx';
import { AiDisclaimerNotice } from './AiDisclaimerNotice.tsx';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  SupportedSpeechLang,
} from '../utils/speechUtils.ts';

interface ChatDrawerProps {
  topic: TopicRecord;
  onClose: () => void;
  onOpenProblemSolver?: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  topic,
  onClose,
  onOpenProblemSolver,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Салом! Ман **Илмисино** — муаллими шумо барои мавзӯи **"${topic.title}"** ҳастам. Чӣ чизе бароятон нофаҳмо аст? Ё ягон масъала ё машқ аз китоб доред? Метавонед савол нависед ё акси масъаларо бифиристед, то қадам ба қадам ҳал кунем!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportingText, setReportingText] = useState<string | null>(null);

  // Speech Recognition State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<SupportedSpeechLang>('tg-TJ');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const speechRecognizerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const speechSupported = isSpeechRecognitionSupported();

  const handleToggleVoice = () => {
    if (!speechSupported) return;
    setSpeechError(null);

    if (isListening) {
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognizer = createSpeechRecognizer(
        speechLang,
        (transcript) => {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        },
        (err) => {
          setSpeechError(err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );

      if (recognizer) {
        speechRecognizerRef.current = recognizer;
        recognizer.start();
        setIsListening(true);
      }
    } catch (e: any) {
      setSpeechError('Фаъолсозии овоз муяссар нашуд.');
      setIsListening(false);
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: input.trim() || 'Лутфан ин масъалаи аксро ҳал кунед.',
      imageUrl: selectedImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    const curImg = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const historyToSend = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await requestChatReply({
        title: topic.title,
        text: topic.cleanText,
        subject: topic.subjectId,
        messages: [...historyToSend, { role: 'user', content: userMsg.content }],
        image: curImg
          ? {
              data: curImg,
              mimeType: 'image/jpeg',
            }
          : undefined,
      });

      const assistantMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: 'Мутаассифона хатогӣ рух дод. Лутфан саволи худро дубора бипурсед.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateLast = async () => {
    if (messages.length < 2 || isLoading) return;
    // Find last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const history = messages.slice(0, actualIdx).map((m) => ({ role: m.role, content: m.content }));
    const userMsg = messages[actualIdx];

    setIsLoading(true);
    try {
      const res = await requestChatReply({
        title: topic.title,
        text: topic.cleanText,
        subject: topic.subjectId,
        messages: [...history, { role: 'user', content: userMsg.content }],
      });

      const updated = [...messages];
      updated[messages.length - 1] = {
        id: 'msg_ai_regen_' + Date.now(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(updated);
    } catch {
      // Keep existing message
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const res = ev.target?.result as string;
        if (res) setSelectedImage(res);
      };
      reader.readAsDataURL(file);
    }
  };

  const quickPrompts = [
    'Ин формуларо боз ҳам содатар шарҳ деҳ',
    'Дар имтиҳони ММТ аз ин мавзӯъ чӣ мепурсанд?',
    'Як мисоли амалии дигар биёр',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-xl h-[92vh] sm:h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  Омӯзгор Илмисино
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                Мавзӯъ: {topic.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMessages([messages[0]])}
              title="Тоза кардани суҳбат"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 space-y-2 text-xs sm:text-sm ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="Акси фиристодашуда"
                      className="rounded-xl max-h-48 w-auto object-cover border border-white/20"
                    />
                  )}
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  ) : (
                    <>
                      <MarkdownView content={m.content} />
                      {isTextReported(m.content) && (
                        <div className="mt-1 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[10px] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Хато қайд шудааст</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleRegenerateLast}
                            disabled={isLoading}
                            className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold hover:bg-amber-700 flex items-center gap-1"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>Дубора</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {/* Disclaimer notice, speaker, and report button for assistant answers */}
                  {!isUser ? (
                    <div className="space-y-1 pt-1">
                      <AiDisclaimerNotice
                        variant="full"
                        speakableText={m.content}
                        onReport={() => setReportingText(m.content)}
                      />
                      <div className="text-[10px] text-slate-400 text-right">
                        {m.timestamp}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-medium pt-1 flex items-center justify-end border-t border-white/20 text-emerald-100">
                      <span>{m.timestamp}</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-slate-500 dark:text-slate-400 text-xs py-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span className="italic">Илмисино фикр карда истодааст...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {onOpenProblemSolver && (
            <button
              type="button"
              onClick={onOpenProblemSolver}
              className="text-[11px] font-extrabold py-1 px-3 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>🧮 Масъала ҳал кун</span>
            </button>
          )}

          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInput(p)}
              className="text-[11px] font-semibold py-1 px-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-400 transition-colors whitespace-nowrap shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Image Attachment Preview */}
        {selectedImage && (
          <div className="p-2.5 px-4 bg-slate-100 dark:bg-slate-800 flex items-center gap-3 border-t border-slate-200 dark:border-slate-700">
            <img
              src={selectedImage}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-600"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200 block">
                Акси масъала замима шуд
              </span>
              <span className="text-slate-500 text-[10px]">Илмисино онро ҳал мекунад</span>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Speech Error Banner */}
        {speechError && (
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between animate-fade-in">
            <span>{speechError}</span>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-[11px] font-bold text-rose-600 underline ml-2"
            >
              Фаҳмо
            </button>
          </div>
        )}

        {/* Listening Indicator with Language Switch */}
        {isListening && (
          <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">Гӯш карда истодаам... Саволро гӯед!</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSpeechLang(speechLang === 'tg-TJ' ? 'ru-RU' : 'tg-TJ')}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-[10px] font-extrabold"
              >
                {speechLang === 'tg-TJ' ? 'Тоҷикӣ' : 'Русӣ'}
              </button>
              <button
                type="button"
                onClick={handleToggleVoice}
                className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold"
              >
                Қатъ
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          {/* Hidden inputs */}
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
            title="📷 Акси масъала бо камера"
            className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="🖼 Интихоби акс аз галерея"
            className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Voice Mic Button (Supported gracefully) */}
          {speechSupported && (
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListening ? 'Қатъ кардани сабти овоз' : 'Савол бо овоз (Микрофон)'}
                className={`p-2.5 rounded-xl transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                    : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Language Switch Toggle chip */}
              <button
                type="button"
                onClick={() => setSpeechLang(speechLang === 'tg-TJ' ? 'ru-RU' : 'tg-TJ')}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors -ml-1 mr-0.5"
                title="Иваз кардани забони шинохти овоз (Тоҷикӣ / Русӣ)"
              >
                {speechLang === 'tg-TJ' ? 'ТҶ' : 'РУ'}
              </button>
            </div>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={isListening ? 'Гӯш карда истодаам...' : 'Саволи худро бипурсед ё бо овоз гӯед...'}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mistake Report Modal */}
      <ReportModal
        isOpen={!!reportingText}
        onClose={() => setReportingText(null)}
        subject={topic.subjectId}
        topicTitle={topic.title}
        exactText={reportingText || ''}
        source="chat"
      />
    </div>
  );
};
