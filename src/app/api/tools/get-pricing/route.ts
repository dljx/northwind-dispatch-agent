import "server-only";
import { NextResponse } from "next/server";
import { hasValidSecret } from "@/lib/auth";
import { lookupPricing, type Topic } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * get_pricing — replaces the pricing knowledge-base document.
 *
 * Returns a speakable string the agent can say verbatim, plus the structured figures.
 * On failure it does NOT fall back to a plausible-sounding answer: it tells the agent to
 * say a technician will confirm on site. A wrong price is a commercial commitment; no
 * price is merely an inconvenience.
 */

const TOPICS: Topic[] = ["diagnostic", "repair", "membership", "travel"];

const FAILURE_SPEAK =
  "I don't have that figure in front of me — the technician will confirm the price on site before any work starts.";

type Body = { topic?: string; service_type?: string; service_plan?: string };

export async function POST(req: Request) {
  if (!hasValidSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let b: Body = {};
  try {
    b = (await req.json()) as Body;
  } catch {
    /* fall through to the default topic */
  }

  const topic = (TOPICS as string[]).includes(b.topic ?? "")
    ? (b.topic as Topic)
    : "diagnostic";

  try {
    const result = await lookupPricing(topic, {
      serviceType: b.service_type,
      servicePlan: b.service_plan,
    });
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("get-pricing failed", reason);
    return NextResponse.json({
      ok: false,
      speak: FAILURE_SPEAK,
      figures: [],
      error: reason.slice(0, 300),
    });
  }
}
