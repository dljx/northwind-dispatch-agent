import "server-only";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { hasValidSecret } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { createBooking } from "@/lib/calcom";
import { pageOnCall, sendConfirmation, type JobCard } from "@/lib/notify";
import { speakWindow, labelWindow } from "@/lib/speech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * book_job — spec §3.1, §4.3. The fan-out endpoint.
 *
 * Only the Cal.com booking is awaited, because only it is needed to speak the
 * confirmation. Slack and the email go out via waitUntil after the response returns.
 * Putting three vendors in series inside the call the caller is waiting on would add
 * dead air at precisely the beat where this demo claims there is none.
 *
 * Idempotency is a behaviour, not just a unique index. On conflict this reads the
 * existing job back and returns the original payload. A bare constraint would turn a
 * retry into a 500, firing the agent's failure path and transferring a caller whose job
 * was in fact booked — booked *and* transferred being the worst outcome available.
 */

const FAILURE_SPEAK =
  "I'm having trouble reaching scheduling — let me get you to a person.";

type Body = {
  conversation_id?: string;
  customer_id?: string;
  slot_id?: string;
  service_type?: string;
  urgency?: string;
  issue_summary?: string;
  service_address?: string;
  callback_number?: string;
};

export async function POST(req: Request) {
  if (!hasValidSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let b: Body;
  try {
    b = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, speak: FAILURE_SPEAK, should_transfer: true });
  }

  const slotId = b.slot_id?.trim();
  if (!slotId) {
    return NextResponse.json({ ok: false, speak: FAILURE_SPEAK, should_transfer: true });
  }

  // conversation_id alone when there is no slot: a null key in a unique index protects
  // nothing, which would leave the emergency path — the one that matters most — unguarded.
  const idempotencyKey = `${b.conversation_id ?? "unknown"}:${slotId}`;
  const spoken = speakWindow(slotId);
  const window = labelWindow(slotId);

  try {
    const existing = await db()
      .from("jobs")
      .select("id, scheduled_for")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({
        ok: true,
        already_booked: true,
        job_id: existing.data.id,
        speak: `You're already booked in for ${spoken}.`,
        window,
      });
    }

    const customer = b.customer_id
      ? await db()
          .from("customers")
          .select("name, email, service_address")
          .eq("id", b.customer_id)
          .maybeSingle()
      : null;

    const name = customer?.data?.name ?? "Northwind caller";
    const email = customer?.data?.email ?? null;
    const address =
      b.service_address?.trim() || customer?.data?.service_address || "Address on file";
    const issue = (b.issue_summary ?? "").slice(0, 200) || "No summary captured.";

    // Awaited: the confirmation cannot be spoken until this succeeds.
    const booking = await createBooking({
      startIso: slotId,
      name,
      email: email ?? "dispatch@northwind.example",
      address,
      notes: issue,
    });

    const { data: job, error } = await db()
      .from("jobs")
      .insert({
        customer_id: b.customer_id || null,
        service_type: b.service_type ?? "other",
        urgency: b.urgency ?? "routine",
        issue_summary: issue,
        scheduled_for: booking.startIso,
        cal_booking_id: booking.uid,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (error) throw new Error(`job insert: ${error.message}`);

    const card: JobCard = {
      customerName: name,
      address,
      serviceType: b.service_type ?? "other",
      urgency: b.urgency ?? "routine",
      issueSummary: issue,
      window,
      callbackNumber: b.callback_number ?? "unknown",
    };

    // Deferred: neither of these blocks the spoken confirmation.
    waitUntil(pageOnCall(card));
    waitUntil(sendConfirmation(email, card));

    return NextResponse.json({
      ok: true,
      job_id: job.id,
      cal_booking_id: booking.uid,
      window,
      speak: `You're all set for ${spoken}.`,
    });
  } catch (err) {
    console.error("book-job failed", err);
    return NextResponse.json({ ok: false, speak: FAILURE_SPEAK, should_transfer: true });
  }
}
