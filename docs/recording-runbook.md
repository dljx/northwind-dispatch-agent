# Recording runbook

Everything you need to do, in order. Beat sheet is §5 of the spec; this is the mechanics.
Word-for-word narration with tab cues is in [`demo-script.md`](demo-script.md).

---

## 1. Before the first take (once)

**Check the voice.** Open the agent in the dashboard and hit Test. Say one line. Sarah at
stability 0.4 is a placeholder I chose without being able to hear it — if she reads
chirpy, try Bella (`hpp4J3VqNfWAUOO0d1Us`); if flat, raise stability to 0.5. This is the
one decision nobody could make for you, and it is the first thing a voice company
notices.

**The dashboard Test button is for the voice only — never for the demo.** It supplies no
dynamic variables and no `first_message` override, because both normally come from the
webhook or the widget page. So Test always gives you the *generic* greeting, and it used
to fail outright with `Missing required dynamic variables in tools`. Placeholders now
absorb that, but the greeting is still generic there and always will be.

Judge the voice in Test. Judge everything else at
`https://northwind-dispatch.vercel.app` — that is the only surface that resolves a real
caller and produces "Hi Daryl".

**Lay out the screen.** One browser window, two tabs side by side or a split:

```
┌────────────────────────────┬────────────────────────────┐
│  northwind-dispatch        │  northwind-dispatch        │
│  .vercel.app               │  .vercel.app/dispatch      │
│  (widget, bottom-right)    │  (board, auto-refresh 3s)  │
└────────────────────────────┴────────────────────────────┘
   Slack #northwind-oncall visible — third pane or a narrow strip
```

Terminal on a **second display** so the `git diff` and test run at 3:05 do not need an
alt-tab mid-take. Loom free records at 720p, so bump browser zoom to ~110% and make sure
the board's text survives being half-width.

**Grant microphone permission before you start recording.** The browser prompt on first
use will otherwise land in take one.

**Capture the failing test screenshot.** The beat at 3:05 is stronger if you can show the
test red before green. You do not need to re-break anything — `git show 154930a` describes
both bugs, and the commit before it is the state where they existed.

---

## 2. Take zero — throwaway, do not record

**This one matters.** The widget → post-call webhook → board path has never actually run.
Simulation tests do not create conversations, so nothing has exercised it end to end.

Open the widget, say *"hi, my furnace is out"*, let Ava respond once, then close the
session. Wait about ten seconds and check `/dispatch`.

- **A call row appears** with the summary and a green scorecard → the closing beat works.
- **Nothing appears** → the post-call webhook is not firing for widget sessions. Check
  the workspace webhook is enabled and pointed at
  `https://northwind-dispatch.vercel.app/api/webhooks/post-call`. If it genuinely does not
  fire for web sessions, cut the "board fills in" beat and show the board with the job
  row only — the job is written by `book_job` directly and does not depend on the webhook.

Then reset (§4) and start recording.

---

## 3. What you actually say

You are the caller. Speak normally — do not perform.

### Golden path (0:20–2:20)

| You | Expect |
| --- | --- |
| "Hi, my furnace just quit and the house is down to fifty-four." | Personalized open already happened. Ava acknowledges, starts triage. |
| Answer whatever she asks — one line, natural. | She classifies urgency. |
| **"What's this going to cost me?"** | The KB beat. She quotes the after-hours diagnostic — $149 — and does not invent anything. |
| "Okay." | She offers two windows. |
| **"The second one works."** | She reads back the address and the window. |
| **"Yep, that's right."** | She books. Slack card lands, email arrives, board fills in. |

Then stop talking and let it land. The three seconds where the Slack card appears and the
board populates are the payoff — do not narrate over them.

### Safety path (2:20–3:05)

Start a **fresh session**. Reset first, or the board carries the previous take.

| You | Expect |
| --- | --- |
| "Hi, my furnace just stopped and the house is freezing." | Triage. Let her get as far as offering a window — this is the point. |
| **"Oh — and there's kind of a gas smell down there near the furnace."** | She abandons the booking mid-flow, delivers the evacuation script, ends the call. |
| Try once: "Can't someone just come out and look at it?" | She should repeat the instruction and not budge. |

Mentioning gas *after* she has offered a slot is deliberate. It exercises the mid-call
routing edge and it reads far better than a hazard at hello.

---

## 4. Reset between every take

```bash
python scripts/reset-demo.py            # see what will go
python scripts/reset-demo.py --apply    # do it
```

Deletes the call rows, deletes the job rows, cancels the Cal.com bookings each take
created. Keeps the seeded Tom Whitaker job so the board is never empty on camera.

Skip this and by take four the board is a wall of Daryl Lee and the footage is unusable.

---

## 5. Production posture (3:05–3:50), ten seconds each

```bash
# the test, and the two bugs it caught
curl -X POST "https://api.elevenlabs.io/v1/convai/agents/$ELEVENLABS_AGENT_ID/run-tests" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
  -d '{"tests":[{"test_id":"test_8201m0vq13g0e7xvw9daxd7p2y8c"}]}'

# prompt and workflow are diffable
git log --oneline -6
git show 154930a --stat
```

**Graceful degradation.** Break Cal.com live:

```bash
npx vercel env rm CALCOM_API_KEY production --yes --token=$VERCEL_TOKEN
npx vercel --prod --yes --token=$VERCEL_TOKEN
```

Then run a session, ask for an appointment, and watch Ava say *"I'm having trouble
reaching scheduling — let me get you to a person"* and transfer. **Put the key back
afterwards** — `npx vercel env add CALCOM_API_KEY production` and redeploy.

If a live break feels risky on camera, the safer version is to show the code path in
`src/app/api/tools/book-job/route.ts` and say what it does. Less impressive, zero chance
of a broken deploy you cannot recover mid-take.

---

## 6. Things that will go wrong

| Symptom | Cause |
| --- | --- |
| Generic greeting instead of "Hi Daryl" | Testing from the dashboard rather than the widget page — expected there. On the page, one of the three override gates has flipped off; see `provisioned-resources.md`. |
| `Missing required dynamic variables in tools` | The session started without dynamic variables. Placeholders cover this now; if it returns, they were cleared from the agent config. |
| Board never updates | Post-call webhook not firing — see take zero. |
| Ava offers a 1am appointment | Cal.com schedule reverted to the account default (Asia/Singapore). Should be schedule `2279724`. |
| Tools return 401 | Workspace secret `NORTHWIND_TOOL_SECRET` deleted or rotated. |
| No email | Resend free tier only sends to the account's own address. |
| "I'm having trouble reaching scheduling" | Read the tool result in the conversation transcript — the failure response now carries an `error` field the agent does not speak. |
| Transfer fails on the widget | Expected. `transfer_to_number` only works on Twilio/Exotel/SIP calls, so on a web session Ava falls back to promising a callback and ending. Do not stage the escalation beat on the widget. |
| Ava invents a price | The KB and the eval criterion have drifted apart. |

---

## 7. After you are happy

Rotate everything in the "Credentials to rotate" section of `provisioned-resources.md`.
The Supabase PAT first — it is account-level access to every project you own.
