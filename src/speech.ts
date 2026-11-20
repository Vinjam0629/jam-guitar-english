// Browser speech only. No network voices, no Google / YouTube.
// WeChat on iOS exposes speechSynthesis but does not play it.

export const SPEAK_FAIL = "当前环境听不了朗读，可点右上角用 Safari 打开";

let failHandler: (() => void) | null = null;

export function bindSpeakError(handler: () => void): void {
  failHandler = handler;
}

function blockedHere(): boolean {
  if (typeof window === "undefined") return true;
  const ua = navigator.userAgent || "";
  const wechat = /MicroMessenger/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  if (wechat && ios) return true;
  return typeof speechSynthesis === "undefined" || !speechSynthesis;
}

function arm(utterance: SpeechSynthesisUtterance): void {
  utterance.lang = "en-US";
  utterance.onerror = (event) => {
    const reason = String(event.error);
    if (reason === "interrupted" || reason === "canceled" || reason === "cancelled") return;
    failHandler?.();
  };
}

export function speakEnglish(text: string): boolean {
  try {
    if (blockedHere()) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    arm(utterance);
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function speakQueue(texts: string[]): boolean {
  try {
    if (blockedHere()) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();
    texts.forEach((text) => {
      const utterance = new SpeechSynthesisUtterance(text);
      arm(utterance);
      synth.speak(utterance);
    });
    return true;
  } catch {
    return false;
  }
}
