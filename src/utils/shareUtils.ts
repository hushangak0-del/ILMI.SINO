/**
 * Telegram & Web Share API utilities for Ilmisino
 */

export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://ilmisino.tj';
}

export interface ShareOptions {
  title?: string;
  text: string;
  url?: string;
}

/**
 * Truncate text cleanly to stay well within Telegram / URL / share limits (< 1000 chars)
 */
export function sanitizeShareText(text: string, maxLen = 850): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 3) + '...';
}

/**
 * Share text via Web Share API when supported on phone,
 * or fallback to opening direct Telegram share link.
 */
export async function shareToTelegram(options: ShareOptions): Promise<boolean> {
  const appUrl = options.url || getAppUrl();
  const cleanText = sanitizeShareText(options.text);
  const shareTitle = options.title || 'Илмисино - Ёрдамчии ҳушманди дарс';

  // Check if Web Share API is available (common on Android Chrome & iOS Safari)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: cleanText,
        url: appUrl,
      });
      return true;
    } catch (err: any) {
      // If user cancelled (AbortError), don't force open Telegram
      if (err?.name === 'AbortError') {
        return false;
      }
      // Otherwise fall through to Telegram web link
    }
  }

  // Telegram direct share link
  const fullMessage = `${cleanText}\n\n👉 ${appUrl}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(cleanText)}`;
  
  if (typeof window !== 'undefined') {
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  }
  return true;
}

/**
 * Invite friends message
 */
export async function inviteFriends(): Promise<boolean> {
  const message = 'Илмисино: ёвари ҳушманд барои омодагӣ ба ММТ. Аксро гир, шарҳ, хулоса ва тест гир! 📚';
  return shareToTelegram({
    title: 'Илмисино - Даъвати дӯстон',
    text: message,
  });
}
