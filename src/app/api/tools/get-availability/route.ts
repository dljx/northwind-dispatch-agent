import "server-only";
import { NextResponse } from "next/server";
import { hasValidSecret } from "@/lib/auth";
import { getSlots } from "@/lib/calcom";
import { speakWindow, labelWindow, speakOffer } from "@/lib/speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * get_availability — spec §4.3.
 *
 * Returns a speakable string alongside the structured slots. The agent should be able
 * to say `speak` verbatim; tools that return raw JSON produce agents that babble.
 *
 * Offers exactly two slots. A third makes the call longer and the decision harder.
 */

const FAILURE_SPEAK =
  "I'm having trouble reaching scheduling — let me get you to a person.";

type Body = { service_type?: string; urgency?: string };

export async function POST(req: Request) {
  if (!hasValidSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let urgency = "routine";
  try {
    const body = (await req.json()) as Body;
    if (body.urgency) urgency = body.urgency;
  } catch {
    // Fall through on a malformed body; availability does not depend on it.
  }

  try {
    const slots = await getSlots(3);
    if (slots.length === 0) {
      return NextResponse.json({
        ok: true,
        speak: speakOffer([]),
        should_transfer: true,
        slots: [],
      });
    }

    // Emergencies take the earliest slot and are not offered a choice — the caller
    // with no heat at 20°F wants a truck, not a menu. Everyone else picks from two.
    const chosen = urgency === "emergency" ? slots.slice(0, 1) : slots.slice(0, 2);

    return NextResponse.json({
      ok: true,
      speak: speakOffer(chosen.map((s) => s.startIso)),
      slots: chosen.map((s) => ({
        slot_id: s.startIso,
        window: labelWindow(s.startIso),
        spoken: speakWindow(s.startIso),
      })),
    });
  } catch (err) {
    console.error("get-availability failed", err);
    return NextResponse.json({
      ok: false,
      speak: FAILURE_SPEAK,
      should_transfer: true,
      slots: [],
    });
  }
}
