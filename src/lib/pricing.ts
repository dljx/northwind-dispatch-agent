import "server-only";
import { db } from "./supabase";

/**
 * Pricing lookups.
 *
 * This used to be a RAG document. It should not have been: RAG is a similarity match
 * over prose, a price is an exact lookup on a small key set with one right answer, and
 * when retrieval misses it fails silently — the agent finds no figure and says something
 * plausible while knowing nothing. A tool call either returns the number or errors.
 *
 * The other advantage only became obvious once it was a query: the tool can see who is
 * calling. A Comfort Plan member's diagnostic is waived, and a document cannot know that.
 */

export type Topic = "diagnostic" | "repair" | "membership" | "travel";

type Row = {
  key: string;
  category: string;
  label: string;
  amount_low_cents: number;
  amount_high_cents: number | null;
  unit: string | null;
  service_type: string | null;
  note: string | null;
};

const TIMEOUT_MS = 4_000;

/** 14900 -> "149 dollars". Spoken form, not "$149", which TTS reads unevenly. */
function money(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `${dollars.toLocaleString("en-US")} dollars`;
}

function range(row: Row): string {
  if (row.amount_high_cents == null) return money(row.amount_low_cents);
  return `${Math.round(row.amount_low_cents / 100).toLocaleString("en-US")} to ${money(
    row.amount_high_cents,
  )}`;
}

export type PricingResult = {
  ok: boolean;
  speak: string;
  figures: { label: string; low: number; high: number | null; unit: string | null }[];
};

export async function lookupPricing(
  topic: Topic,
  opts: { serviceType?: string; servicePlan?: string; afterHours?: boolean } = {},
): Promise<PricingResult> {
  const isMember = Boolean(opts.servicePlan && opts.servicePlan.trim().length > 0);

  const { data, error } = await db()
    .from("pricing")
    .select("key, category, label, amount_low_cents, amount_high_cents, unit, service_type, note")
    .eq("category", topic)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .abortSignal(AbortSignal.timeout(TIMEOUT_MS));

  if (error) throw new Error(`pricing lookup: ${error.message}`);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) throw new Error(`pricing lookup: no rows for topic ${topic}`);

  const figures = rows.map((r) => ({
    label: r.label,
    low: Math.round(r.amount_low_cents / 100),
    high: r.amount_high_cents == null ? null : Math.round(r.amount_high_cents / 100),
    unit: r.unit,
  }));

  if (topic === "diagnostic") {
    // The fiction is always after hours, so that is the figure that applies unless the
    // caller is on a plan — in which case there is no figure at all, which is the more
    // useful answer and the one a document could never give.
    const after = rows.find((r) => r.key === "diagnostic_after_hours") ?? rows[0]!;
    if (isMember) {
      return {
        ok: true,
        speak:
          `Your ${opts.servicePlan} covers it — there's no call-out fee for you tonight. ` +
          `The technician will confirm any repair price on site before doing the work.`,
        figures,
      };
    }
    return {
      ok: true,
      speak:
        `The after-hours diagnostic is ${money(after.amount_low_cents)}. That covers the ` +
        `visit, and it comes off the repair if you go ahead the same day.`,
      figures,
    };
  }

  if (topic === "repair") {
    const match = opts.serviceType
      ? rows.filter((r) => r.service_type === opts.serviceType)
      : [];
    const pick = (match.length > 0 ? match : rows).slice(0, 2);
    // Lowercase the label so it reads mid-sentence, but leave initialisms alone —
    // "ac refrigerant leak repair" is not how anyone says it.
    const speakLabel = (l: string) =>
      l.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase()).replace(/Ac/g, "AC");
    const parts = pick.map((r) => `${speakLabel(r.label)} runs ${range(r)}`);
    return {
      ok: true,
      speak:
        `It depends what's failed — ${parts.join(", and ")}. ` +
        `The technician confirms the exact price on site before starting.`,
      figures,
    };
  }

  if (topic === "membership") {
    const plan = rows[0]!;
    return {
      ok: true,
      speak:
        `The Comfort Plan is ${money(plan.amount_low_cents)} a month. It waives the ` +
        `call-out fee, includes two tune-ups a year, and takes fifteen percent off repairs.`,
      figures,
    };
  }

  const travel = rows[0]!;
  return {
    ok: true,
    speak: isMember
      ? `There's no travel fee on your plan.`
      : `If you're outside our core area there's a travel fee of ${money(
          travel.amount_low_cents,
        )}, charged once per visit.`,
    figures,
  };
}

/** Every figure the agent is permitted to say. Used to generate the eval criterion. */
export async function allApprovedFigures(): Promise<string[]> {
  const { data, error } = await db()
    .from("pricing")
    .select("label, amount_low_cents, amount_high_cents, unit")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Row;
    const amt = range(row).replace(/ dollars$/, "");
    return `${row.label}: $${amt}${row.unit ? ` per ${row.unit}` : ""}`;
  });
}
