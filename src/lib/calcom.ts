import "server-only";
import { requireEnv } from "./env";
import { TZ } from "./speech";

/**
 * Cal.com v2. Two things here were learned the hard way and are easy to regress:
 *
 * 1. `cal-api-version` is required and DIFFERS PER ENDPOINT. Sending the bookings
 *    version to /slots does not error usefully, it just misbehaves.
 * 2. A booking is addressed by `data.uid` (a string), not the numeric `data.id`.
 *    `jobs.cal_booking_id` stores the uid.
 *
 * The account's own timezone is Asia/Singapore, so every request pins America/Chicago
 * explicitly. Schedule 2279724 exists for the same reason — see docs/provisioned-resources.md.
 */

const BASE = "https://api.cal.com/v2";
const V_SLOTS = "2024-09-04";
const V_BOOKINGS = "2024-08-13";

const TIMEOUT_MS = 8_000;

function headers(version: string): Record<string, string> {
  return {
    Authorization: `Bearer ${requireEnv("CALCOM_API_KEY")}`,
    "cal-api-version": version,
    "Content-Type": "application/json",
  };
}

export type Slot = { startIso: string };

/**
 * Slots for the next `days` days. The response is an OBJECT keyed by date
 * ("2026-08-26": [{ start }]), not an array — worth remembering when it looks empty.
 */
export async function getSlots(days = 3): Promise<Slot[]> {
  const eventTypeId = requireEnv("CALCOM_EVENT_TYPE_ID");
  const start = new Date();
  const end = new Date(start.getTime() + days * 86_400_000);

  const url =
    `${BASE}/slots?eventTypeId=${encodeURIComponent(eventTypeId)}` +
    `&start=${start.toISOString().slice(0, 10)}` +
    `&end=${end.toISOString().slice(0, 10)}` +
    `&timeZone=${encodeURIComponent(TZ)}`;

  const res = await fetch(url, {
    headers: headers(V_SLOTS),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`cal.com slots ${res.status}`);

  const body = (await res.json()) as { data?: Record<string, { start: string }[]> };
  const byDay = body.data ?? {};

  const now = Date.now();
  return Object.keys(byDay)
    .sort()
    .flatMap((day) => byDay[day] ?? [])
    .map((s) => ({ startIso: s.start }))
    .filter((s) => new Date(s.startIso).getTime() > now)
    .sort((a, b) => a.startIso.localeCompare(b.startIso));
}

export type Booking = { uid: string; startIso: string; endIso: string };

export async function createBooking(input: {
  startIso: string;
  name: string;
  email: string;
  address: string;
  notes: string;
}): Promise<Booking> {
  const res = await fetch(`${BASE}/bookings`, {
    method: "POST",
    headers: headers(V_BOOKINGS),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      start: new Date(input.startIso).toISOString(),
      eventTypeId: Number(requireEnv("CALCOM_EVENT_TYPE_ID")),
      attendee: {
        name: input.name,
        email: input.email,
        timeZone: TZ,
        language: "en",
      },
      bookingFieldsResponses: { address: input.address },
      metadata: { source: "northwind-voice" },
    }),
  });

  if (!res.ok) throw new Error(`cal.com booking ${res.status}: ${await res.text()}`);

  const body = (await res.json()) as {
    data?: { uid?: string; start?: string; end?: string };
  };
  const uid = body.data?.uid;
  if (!uid) throw new Error("cal.com booking returned no uid");

  return {
    uid,
    startIso: body.data?.start ?? input.startIso,
    endIso: body.data?.end ?? input.startIso,
  };
}
