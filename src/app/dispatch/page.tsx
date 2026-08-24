import { db } from "@/lib/supabase";
import { AutoRefresh } from "./auto-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dispatch board — spec §3.1, §5.
 *
 * Unauthenticated by design (§8), which is why RLS is on with no policies and this
 * page reads through the server with the service role rather than letting the browser
 * near Supabase.
 *
 * All times render in America/Chicago. The fiction is a Minneapolis contractor; the
 * machine recording the demo is in Singapore. Formatting in the server's local zone
 * would put 3am on screen next to a caller being told "eight to ten tomorrow morning".
 */

const TZ = "America/Chicago";

type CustomerRef = { name: string | null } | null;

type JobRow = {
  id: string;
  service_type: string;
  urgency: string;
  issue_summary: string | null;
  scheduled_for: string | null;
  status: string;
  customers: CustomerRef;
};

type CallRow = {
  id: string;
  conversation_id: string;
  transcript_summary: string | null;
  data_collection: Record<string, unknown> | null;
  evaluation: Record<string, unknown> | null;
  duration_secs: number | null;
  created_at: string;
  customers: CustomerRef;
};

const SERVICE_LABEL: Record<string, string> = {
  hvac_no_heat: "No heat",
  hvac_no_cool: "No cooling",
  plumbing_leak: "Leak",
  plumbing_clog: "Clog",
  other: "Other",
};

function when(iso: string | null): string {
  if (!iso) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Analysis values arrive wrapped as { value, rationale }; tolerate a bare scalar too. */
function unwrapValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    return v === null || v === undefined || v === "" ? "" : String(v);
  }
  return String(raw);
}

/** Criteria arrive as { result: "success" | "failure" | "unknown", rationale }. */
function unwrapResult(raw: unknown): "success" | "failure" | "unknown" {
  const v =
    typeof raw === "object" && raw !== null && "result" in raw
      ? String((raw as { result: unknown }).result)
      : String(raw ?? "");
  return v === "success" || v === "failure" ? v : "unknown";
}

export default async function DispatchBoard() {
  const [jobsRes, callsRes] = await Promise.all([
    db()
      .from("jobs")
      .select("id, service_type, urgency, issue_summary, scheduled_for, status, customers(name)")
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .limit(12),
    db()
      .from("calls")
      .select(
        "id, conversation_id, transcript_summary, data_collection, evaluation, duration_secs, created_at, customers(name)",
      )
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const jobs = (jobsRes.data ?? []) as unknown as JobRow[];
  const calls = (callsRes.data ?? []) as unknown as CallRow[];
  const failed = jobsRes.error ?? callsRes.error;

  return (
    <div className="wrap">
      <AutoRefresh seconds={3} />

      <header className="top">
        <div>
          <h1>Northwind Dispatch</h1>
          <div className="sub">After-hours board · all times Central</div>
        </div>
        <span className="live">
          <span className="dot" />
          Live
        </span>
      </header>

      {failed && (
        <div className="empty-state">
          Could not reach the database. {failed.message}
        </div>
      )}

      <h2>Scheduled jobs</h2>
      {jobs.length === 0 ? (
        <div className="empty-state">No jobs booked yet.</div>
      ) : (
        jobs.map((job) => (
          <article className="card" key={job.id}>
            <div className="row">
              <div>
                <div className="name">{job.customers?.name ?? "Unknown caller"}</div>
                <div className="meta">
                  {SERVICE_LABEL[job.service_type] ?? job.service_type}
                  {" · "}
                  <span className={`tag ${job.urgency}`}>
                    {job.urgency.replace("_", " ")}
                  </span>
                  {job.status !== "scheduled" && ` · ${job.status}`}
                </div>
              </div>
              <div className="when">{when(job.scheduled_for)}</div>
            </div>
            {job.issue_summary && <div className="summary">{job.issue_summary}</div>}
          </article>
        ))
      )}

      <h2>Calls</h2>
      {calls.length === 0 ? (
        <div className="empty-state">
          No calls yet. The board fills in when the post-call webhook lands.
        </div>
      ) : (
        calls.map((call) => {
          const fields = Object.entries(call.data_collection ?? {});
          const criteria = Object.entries(call.evaluation ?? {});

          return (
            <article className="card" key={call.id}>
              <div className="row">
                <div>
                  <div className="name">{call.customers?.name ?? "Unknown caller"}</div>
                  <div className="meta">
                    {clock(call.created_at)}
                    {call.duration_secs !== null && ` · ${call.duration_secs}s`}
                  </div>
                </div>
              </div>

              {call.transcript_summary && (
                <div className="summary">{call.transcript_summary}</div>
              )}

              {fields.length > 0 && (
                <div className="fields">
                  {fields.map(([key, raw]) => {
                    const value = unwrapValue(raw);
                    return (
                      <div className="field" key={key}>
                        <div className="k">{key.replace(/_/g, " ")}</div>
                        <div className={value ? "v" : "v empty"}>{value || "—"}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {criteria.length > 0 && (
                <div className="scorecard">
                  {criteria.map(([key, raw]) => {
                    const result = unwrapResult(raw);
                    const mark =
                      result === "success" ? "✓" : result === "failure" ? "✕" : "–";
                    return (
                      <span className={`crit ${result}`} key={key}>
                        <span className="mark">{mark}</span>
                        {key.replace(/_/g, " ")}
                      </span>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
