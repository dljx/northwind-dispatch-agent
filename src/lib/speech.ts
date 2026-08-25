import "server-only";

/**
 * Turning timestamps into things a person would actually say.
 *
 * Tool-design rule: every tool returns a short speakable string alongside its structured
 * data (spec §4.3). "2026-08-26T13:00:00.000Z" read aloud is what makes agents sound like
 * software. The agent should be able to use these verbatim.
 *
 * Everything renders in America/Chicago — the fiction is Minneapolis regardless of where
 * the server or the person recording happens to be.
 */

export const TZ = "America/Chicago";

const HOUR_WORD = [
  "twelve", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten", "eleven",
];

function parts(iso: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "long",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(iso))) out[p.type] = p.value;
  return {
    ymd: `${out.year}-${out.month}-${out.day}`,
    hour: Number(out.hour),
    weekday: out.weekday ?? "",
  };
}

function todayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "today" / "tomorrow" / "Thursday" — nobody says "August the twenty-sixth" on the phone. */
function dayWord(ymd: string, weekday: string): string {
  const today = todayYmd();
  if (ymd === today) return "today";
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  if (ymd === t.toISOString().slice(0, 10)) return "tomorrow";
  return weekday;
}

/**
 * Anchored on the START hour, not the end. A 10-to-12 window is a morning appointment;
 * keying off the end hour called it "the afternoon", which is the kind of small wrongness
 * a listener notices without being able to say why.
 */
function partOfDay(startHour: number): string {
  if (startHour < 12) return "in the morning";
  if (startHour < 17) return "in the afternoon";
  return "in the evening";
}

function range(hour: number, hours: number): string {
  const from = HOUR_WORD[hour % 12] ?? String(hour);
  const to = HOUR_WORD[(hour + hours) % 12] ?? String(hour + hours);
  return `between ${from} and ${to}`;
}

/** "tomorrow between eight and ten in the morning" */
export function speakWindow(startIso: string, hours = 2): string {
  const { ymd, hour, weekday } = parts(startIso);
  return `${dayWord(ymd, weekday)} ${range(hour, hours)} ${partOfDay(hour)}`;
}

/** "Wed Aug 26, 8–10am" — for the board and the structured record, not for speech. */
export function labelWindow(startIso: string, hours = 2): string {
  const d = new Date(startIso);
  const end = new Date(d.getTime() + hours * 3_600_000);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short", month: "short", day: "numeric",
  }).format(d);
  const t = (x: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: true })
      .format(x)
      .replace(" ", "")
      .toLowerCase();
  return `${day}, ${t(d)}–${t(end)}`;
}

/**
 * Joins offers the way a dispatcher would say them.
 *
 * When both windows fall on the same day the day is said once: "tomorrow between eight
 * and ten in the morning, or between ten and twelve." Repeating "tomorrow" in both halves
 * is the tell that a machine assembled the sentence.
 */
export function speakOffer(startIsos: string[], hours = 2): string {
  if (startIsos.length === 0) {
    return "I don't have anything left on the schedule — let me get you to someone who can sort that out.";
  }

  const first = startIsos[0] as string;
  if (startIsos.length === 1) return `I can do ${speakWindow(first, hours)}.`;

  const second = startIsos[1] as string;
  const a = parts(first);
  const b = parts(second);

  if (a.ymd === b.ymd) {
    const tail =
      partOfDay(a.hour) === partOfDay(b.hour)
        ? range(b.hour, hours)
        : `${range(b.hour, hours)} ${partOfDay(b.hour)}`;
    return `I can do ${speakWindow(first, hours)}, or ${tail}.`;
  }

  return `I can do ${speakWindow(first, hours)}, or ${speakWindow(second, hours)}.`;
}
