import { describe, expect, it } from "vitest";
import { AUTOSAVE_DELAY_MS, autosaveStatusLabel, formatAttemptCountdown, shouldWarnAboutTime } from "./assessmentSafety";

describe("assessment safety helpers", () => {
  it("uses a short deliberate debounce for editor autosave", () => {
    expect(AUTOSAVE_DELAY_MS).toBe(650);
  });

  it("reports each lifecycle state in the visible autosave indicator", () => {
    expect(autosaveStatusLabel("queued")).toBe("تجهيز الحفظ");
    expect(autosaveStatusLabel("saving")).toBe("بيتحفظ دلوقتي");
    expect(autosaveStatusLabel("saved")).toBe("اتحفظ");
    expect(autosaveStatusLabel("error")).toBe("تعذر الحفظ");
  });

  it("formats timer values safely and flags only the final five minutes", () => {
    expect(formatAttemptCountdown(65)).toBe("01:05");
    expect(formatAttemptCountdown(-20)).toBe("00:00");
    expect(shouldWarnAboutTime(299)).toBe(true);
    expect(shouldWarnAboutTime(300)).toBe(false);
    expect(shouldWarnAboutTime(0)).toBe(false);
  });
});
