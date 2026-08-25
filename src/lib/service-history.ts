import { addMonths, format } from "date-fns";

// Defaults offered on every technician's "Add entry" form. Technicians can
// append their own via historyViewPrefs.quickLogPresets (settings/history page).
export const DEFAULT_QUICK_LOG_PRESETS = [
  "Tuned to A440",
  "Pitch raise",
  "Regulation",
  "Voicing",
  "Repair",
];

export type HistoryViewPrefs = {
  order: "newest" | "oldest";
  show: {
    readings: boolean;
    photos: boolean;
    recommendations: boolean;
    internalNotes: boolean;
  };
  quickLogPresets: string[];
};

export type ClientViewPrefs = {
  show: {
    readings: boolean;
    photos: boolean;
    recommendations: boolean;
    workPerformed: boolean;
    prices: boolean;
  };
};

const DEFAULT_HISTORY_PREFS: HistoryViewPrefs = {
  order: "newest",
  show: { readings: true, photos: true, recommendations: true, internalNotes: true },
  quickLogPresets: [],
};

const DEFAULT_CLIENT_PREFS: ClientViewPrefs = {
  show: { readings: true, photos: true, recommendations: true, workPerformed: true, prices: false },
};

// TechnicianProfile.historyViewPrefs/clientViewPrefs are stored as free-form
// JSON text (default "{}"); parse defensively and fill in any missing keys.
export function parseHistoryViewPrefs(json: string): HistoryViewPrefs {
  try {
    const parsed = JSON.parse(json);
    return {
      order: parsed?.order === "oldest" ? "oldest" : "newest",
      show: {
        readings: parsed?.show?.readings ?? true,
        photos: parsed?.show?.photos ?? true,
        recommendations: parsed?.show?.recommendations ?? true,
        internalNotes: parsed?.show?.internalNotes ?? true,
      },
      quickLogPresets: Array.isArray(parsed?.quickLogPresets)
        ? parsed.quickLogPresets.filter((p: unknown) => typeof p === "string")
        : [],
    };
  } catch {
    return DEFAULT_HISTORY_PREFS;
  }
}

export function parseClientViewPrefs(json: string): ClientViewPrefs {
  try {
    const parsed = JSON.parse(json);
    return {
      show: {
        readings: parsed?.show?.readings ?? true,
        photos: parsed?.show?.photos ?? true,
        recommendations: parsed?.show?.recommendations ?? true,
        workPerformed: parsed?.show?.workPerformed ?? true,
        prices: parsed?.show?.prices ?? false,
      },
    };
  } catch {
    return DEFAULT_CLIENT_PREFS;
  }
}

// "Due around March 2027" from the last service date + the piano's tuning
// frequency. date-fns addMonths clamps day-of-month overflow (Jan 31 + 1mo =
// Feb 28) and rolls the year over correctly (Dec + 6mo = June next year).
export function nextDueLabel(lastServiceDate: Date | null, frequencyMonths: number): string | null {
  if (!lastServiceDate) return null;
  const due = addMonths(lastServiceDate, frequencyMonths);
  return `Due around ${format(due, "MMMM yyyy")}`;
}

// Dampp-Chaser analytics: avg |pitchOffsetCents| for pianos with vs without
// a Dampp-Chaser installed. Hidden (returns null) unless both groups have
// at least 3 readings — otherwise the comparison is noise.
export function computeDamppChaserStat(
  rows: { pitchOffsetCents: number | null; damppChaserInstalled: boolean }[]
): { withDampChaser: number; withoutDampChaser: number } | null {
  const withVals: number[] = [];
  const withoutVals: number[] = [];
  for (const row of rows) {
    if (row.pitchOffsetCents == null) continue;
    (row.damppChaserInstalled ? withVals : withoutVals).push(Math.abs(row.pitchOffsetCents));
  }
  if (withVals.length < 3 || withoutVals.length < 3) return null;
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return { withDampChaser: avg(withVals), withoutDampChaser: avg(withoutVals) };
}
