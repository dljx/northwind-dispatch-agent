# -*- coding: utf-8 -*-
"""
Regenerate the no_unsourced_pricing evaluation criterion from the pricing table.

Evaluation criteria only ever see the transcript and their own prompt — never the
database, never the knowledge base. So the criterion has to carry a copy of every
approved figure, and the moment someone changes a price without changing the criterion,
the guard starts failing correct answers. A red scorecard that is wrong about why is
worse than no scorecard.

This makes the table the single source and the criterion a generated artifact. Change a
price, run this, done.

    python agent/sync-pricing-criterion.py            # show the generated prompt
    python agent/sync-pricing-criterion.py --apply    # push it to the agent
"""
import io, json, os, subprocess, sys

OTHERS = ("address_confirmed", "window_readback", "hazard_protocol")


def load_env(path=".env.local"):
    if not os.path.exists(path):
        sys.exit("run from the repo root; no .env.local found")
    for line in io.open(path, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def curl(args):
    r = subprocess.run(["curl", "-s"] + args, capture_output=True, text=True)
    return json.loads(r.stdout) if r.stdout.strip() else None


def dollars(cents):
    return f"${cents // 100:,}"


def build_prompt(rows):
    lines = []
    for r in rows:
        amt = dollars(r["amount_low_cents"])
        if r["amount_high_cents"]:
            amt += f"–{dollars(r['amount_high_cents'])}"
        if r["unit"]:
            amt += f" per {r['unit']}"
        lines.append(f"- {r['label']}: {amt}")
    figures = "\n".join(lines)

    return (
        "Did the agent state only approved dollar amounts?\n\n"
        "Pricing is served by the get_pricing tool, and these are the only approved "
        "figures:\n\n" + figures + "\n\n"
        "Return success if the agent stated no dollar amount at all.\n\n"
        "Return success if every dollar amount the agent stated appears above, with "
        "ranges quoted using those exact endpoints.\n\n"
        "Return failure if the agent stated any amount not listed; or narrowed, averaged, "
        "or picked a single number inside a range; or quoted a range with different "
        "endpoints; or attached an approved figure to the wrong thing — for example "
        "quoting the standard diagnostic fee for an after-hours visit, or quoting a fee "
        "to a Comfort Plan member whose fees are waived.\n\n"
        "Also return failure if the agent answered a direct question about cost without "
        "calling get_pricing first, even if the figure it gave happens to be correct. "
        "A right answer from memory is a guess that landed."
    )


def main():
    apply = "--apply" in sys.argv
    load_env()
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    rows = curl([
        f"{os.environ['SUPABASE_URL']}/rest/v1/pricing"
        "?select=label,amount_low_cents,amount_high_cents,unit&active=eq.true"
        "&order=sort_order",
        "-H", f"apikey: {key}", "-H", f"Authorization: Bearer {key}",
    ]) or []

    if not rows:
        sys.exit("no pricing rows — refusing to generate an empty criterion")

    prompt = build_prompt(rows)
    print(f"{len(rows)} figures from the pricing table\n")
    print(prompt[:700] + ("\n…" if len(prompt) > 700 else ""))

    if not apply:
        print("\ndry run — re-run with --apply to push")
        return

    agent = os.environ["ELEVENLABS_AGENT_ID"]
    api = os.environ["ELEVENLABS_API_KEY"]
    current = curl([f"https://api.elevenlabs.io/v1/convai/agents/{agent}",
                    "-H", f"xi-api-key: {api}"])
    existing = ((current.get("platform_settings") or {}).get("evaluation") or {}).get("criteria") or []
    kept = [c for c in existing if c.get("id") in OTHERS]

    kept.append({
        "id": "no_unsourced_pricing",
        "name": "no_unsourced_pricing",
        "type": "prompt",
        "conversation_goal_prompt": prompt,
    })

    io.open("_c.json", "w", encoding="utf-8").write(
        json.dumps({"platform_settings": {"evaluation": {"criteria": kept}}}))
    out = curl(["-X", "PATCH", f"https://api.elevenlabs.io/v1/convai/agents/{agent}",
                "-H", f"xi-api-key: {api}", "-H", "Content-Type: application/json",
                "--data-binary", "@_c.json"])
    os.remove("_c.json")

    got = ((out.get("platform_settings") or {}).get("evaluation") or {}).get("criteria") or []
    print("\ncriteria on agent:", [c.get("id") for c in got])


if __name__ == "__main__":
    main()
