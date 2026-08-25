# -*- coding: utf-8 -*-
"""
Reset the demo to a clean slate between takes.

Every rehearsal leaves debris: a call row on the board, a job row, and a real booking on
the Cal.com calendar. By take four the board is a wall of Daryl Lee and the recording is
unusable. Run this between takes.

  python scripts/reset-demo.py            # show what would be removed
  python scripts/reset-demo.py --apply    # remove it

Keeps the seeded Tom Whitaker job, so the board is never empty on camera.

Requires .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CALCOM_API_KEY,
CALCOM_EVENT_TYPE_ID).
"""
import io, json, os, subprocess, sys, datetime

KEEP_JOB_KEYS = {"seed:whitaker-001"}


def load_env(path=".env.local"):
    if not os.path.exists(path):
        sys.exit("no .env.local found — run from the repo root")
    for line in io.open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def curl(args):
    r = subprocess.run(["curl", "-s"] + args, capture_output=True, text=True)
    try:
        return json.loads(r.stdout) if r.stdout.strip() else None
    except json.JSONDecodeError:
        return r.stdout


def sb(path, method="GET", body=None):
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    args = [f"{os.environ['SUPABASE_URL']}/rest/v1/{path}",
            "-H", f"apikey: {key}", "-H", f"Authorization: Bearer {key}",
            "-H", "Content-Type: application/json"]
    if method != "GET":
        args = ["-X", method] + args
    if body is not None:
        args += ["-d", json.dumps(body)]
    return curl(args)


def cal(path, method="GET", version="2024-08-13", body=None):
    args = [f"https://api.cal.com/v2/{path}",
            "-H", f"Authorization: Bearer {os.environ['CALCOM_API_KEY']}",
            "-H", f"cal-api-version: {version}",
            "-H", "Content-Type: application/json"]
    if method != "GET":
        args = ["-X", method] + args
    if body is not None:
        args += ["-d", json.dumps(body)]
    return curl(args)


def main():
    apply = "--apply" in sys.argv
    load_env()

    calls = sb("calls?select=conversation_id") or []
    jobs = sb("jobs?select=id,idempotency_key,cal_booking_id,scheduled_for") or []
    doomed = [j for j in jobs if j.get("idempotency_key") not in KEEP_JOB_KEYS]

    print("calls to delete : %d" % len(calls))
    for c in calls[:8]:
        print("   ", c.get("conversation_id"))

    print("jobs to delete  : %d  (keeping %d seeded)" % (len(doomed), len(jobs) - len(doomed)))
    for j in doomed[:8]:
        print("    %s  cal=%s" % (j.get("idempotency_key"), j.get("cal_booking_id")))

    uids = [j["cal_booking_id"] for j in doomed if j.get("cal_booking_id")]
    print("cal bookings to cancel: %d" % len(uids))

    if not apply:
        print("\ndry run — nothing changed. re-run with --apply")
        return

    for uid in uids:
        r = cal(f"bookings/{uid}/cancel", "POST",
                body={"cancellationReason": "demo reset between takes"})
        status = (r or {}).get("status", "?")
        print("  cancelled %s -> %s" % (uid, status))

    if calls:
        sb("calls?conversation_id=neq.__none__", "DELETE")
    for j in doomed:
        sb("jobs?id=eq.%s" % j["id"], "DELETE")

    left_calls = sb("calls?select=conversation_id") or []
    left_jobs = sb("jobs?select=idempotency_key") or []
    print("\nafter reset: %d calls, %d jobs (%s)" % (
        len(left_calls), len(left_jobs),
        ", ".join(x.get("idempotency_key", "?") for x in left_jobs) or "none"))
    print("clean. board shows the seeded job only.")


if __name__ == "__main__":
    main()
