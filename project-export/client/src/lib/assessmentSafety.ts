export const AUTOSAVE_DELAY_MS = 650;
export const AUTOSAVE_STATUS_EVENT = "skillforge:autosave-status";

export type AutosaveStatus = "queued" | "saving" | "saved" | "error";

export function autosaveStatusLabel(status: AutosaveStatus) {
  return status === "queued" ? "تجهيز الحفظ" : status === "saving" ? "بيتحفظ دلوقتي" : status === "saved" ? "اتحفظ" : "تعذر الحفظ";
}

export function publishAutosaveStatus(status: AutosaveStatus) {
  window.dispatchEvent(new CustomEvent<AutosaveStatus>(AUTOSAVE_STATUS_EVENT, { detail: status }));
}

export function formatAttemptCountdown(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function shouldWarnAboutTime(seconds: number) {
  return seconds > 0 && seconds < 300;
}
