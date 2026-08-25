import "server-only";
import { optionalEnv } from "./env";

/**
 * The two side effects that fan out of book_job (spec §3.1).
 *
 * Both are deliberately best-effort and never throw. They run after the response has
 * been returned, so a failure here cannot reach the caller — and more importantly, a
 * slow Slack must never add dead air to the beat where the demo claims there is none.
 *
 * If a channel is not configured the call is a no-op rather than an error, so the
 * booking path works before every integration is wired.
 */

type JobCard = {
  customerName: string;
  address: string;
  serviceType: string;
  urgency: string;
  issueSummary: string;
  window: string;
  callbackNumber: string;
};

const URGENCY_EMOJI: Record<string, string> = {
  emergency: "🚨",
  same_day: "⚠️",
  routine: "🔧",
};

export async function pageOnCall(job: JobCard): Promise<void> {
  const url = optionalEnv("SLACK_WEBHOOK_URL", "");
  if (!url) {
    console.warn("slack: SLACK_WEBHOOK_URL unset, skipping on-call page");
    return;
  }

  const emoji = URGENCY_EMOJI[job.urgency] ?? "🔧";
  const heading =
    job.urgency === "emergency"
      ? `${emoji} EMERGENCY — on-call needed`
      : `${emoji} New job booked`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6_000),
      body: JSON.stringify({
        text: `${heading}: ${job.customerName}, ${job.window}`,
        blocks: [
          { type: "header", text: { type: "plain_text", text: heading, emoji: true } },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Customer*\n${job.customerName}` },
              { type: "mrkdwn", text: `*Window*\n${job.window}` },
              { type: "mrkdwn", text: `*Address*\n${job.address}` },
              { type: "mrkdwn", text: `*Callback*\n${job.callbackNumber}` },
            ],
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `*Issue*\n${job.issueSummary}` },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `${job.serviceType} · ${job.urgency.replace("_", " ")} · booked by Ava`,
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) console.error("slack: non-2xx", res.status);
  } catch (err) {
    console.error("slack: page failed", err);
  }
}

export async function sendConfirmation(to: string | null, job: JobCard): Promise<void> {
  const key = optionalEnv("RESEND_API_KEY", "");
  if (!key || !to) {
    // Unknown callers have no address on file, and that is a designed outcome, not a
    // failure: collecting an email by voice costs more than the confirmation is worth.
    console.warn("resend: no key or no recipient, skipping confirmation");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(6_000),
      body: JSON.stringify({
        from: `Northwind Heating & Air <${optionalEnv("RESEND_FROM", "onboarding@resend.dev")}>`,
        to: [to],
        subject: `Your Northwind appointment — ${job.window}`,
        text: [
          `Hi ${job.customerName.split(" ")[0]},`,
          ``,
          `You're booked in. Here are the details:`,
          ``,
          `  When:     ${job.window}`,
          `  Where:    ${job.address}`,
          `  Issue:    ${job.issueSummary}`,
          `  Callback: ${job.callbackNumber}`,
          ``,
          `Your technician will confirm the price on site before doing any work.`,
          `Nothing is charged to book, and there's no charge to reschedule with two`,
          `hours' notice.`,
          ``,
          `— Northwind Heating & Air`,
        ].join("\n"),
      }),
    });
    if (!res.ok) console.error("resend: non-2xx", res.status, await res.text());
  } catch (err) {
    console.error("resend: confirmation failed", err);
  }
}

export type { JobCard };
