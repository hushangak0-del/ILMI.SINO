/**
 * Speech Recognition and Speech Synthesis utilities for Ilmisino
 * Supports Tajik (tg-TJ) with fallback to Russian (ru-RU) and browser speech synthesis
 */

export interface SpeechRecognitionResultState {
  isSupported: boolean;
  isListening: boolean;
  error?: string;
}

export type SupportedSpeechLang = 'tg-TJ' | 'ru-RU';

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createSpeechRecognizer(
  lang: SupportedSpeechLang,
  onResult: (transcript: string) => void,
  onError: (errorMessage: string) => void,
  onEnd: () => void
) {
  if (!isSpeechRecognitionSupported()) {
    onError('Браузери шумо шинохти овозро пуштибонӣ намекунад.');
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = lang;

  recognition.onresult = (event: any) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript) {
      onResult(finalTranscript);
    }
  };

  recognition.onerror = (event: any) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      onError('Иҷозати микрофон дода нашудааст. Лутфан дар танзимоти браузер микрофонро фаъол кунед.');
    } else if (event.error === 'no-speech') {
      onError('Овозе шунида нашуд. Лутфан бори дигар баландтар сухан гӯед.');
    } else if (event.error === 'language-not-supported') {
      // If tg-TJ is not recognized by browser engine, suggest Russian
      onError('Забони тоҷикӣ дар ин дастгоҳ дастрас нест, забони русиро интихоб намоед.');
    } else {
      onError('Хатогӣ дар сабти овоз. Дубора кӯшиш кунед.');
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}

// Speech Synthesis (Text to speech - 🔊 Бо овоз хон)
export function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip markdown formatting for cleaner speech
  const clean = text
    .replace(/[#*_`~[\]()]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();

  if (!clean) return false;

  const utterance = new SpeechSynthesisUtterance(clean);

  // Find suitable voice: Tajik if available, else Russian or default
  const voices = window.speechSynthesis.getVoices();
  const tajikVoice = voices.find((v) => v.lang.startsWith('tg'));
  const russianVoice = voices.find((v) => v.lang.startsWith('ru'));

  if (tajikVoice) {
    utterance.voice = tajikVoice;
    utterance.lang = 'tg-TJ';
  } else if (russianVoice) {
    utterance.voice = russianVoice;
    utterance.lang = 'ru-RU';
  }

  utterance.rate = 0.95; // comfortable study pacing
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  utterance.onerror = (e) => {
    if (onError) onError(e);
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
