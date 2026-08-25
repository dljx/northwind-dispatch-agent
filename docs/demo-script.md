# Demo script

Word for word, with tab cues. Target **4:46** against a hard 5:00 cap, taking Option A at the test segment.

Narration is ~144 seconds of it, measured. The two live conversations are the other ~150, and they
are the part you do not control — so the narration is written tight on purpose. Read it
as written and you land around 4:46. Improvise an extra sentence per segment and you are
over the cap with the close cut off.

Two voices in this recording and it matters that they sound different:

- **NARRATION** — you, to the viewer. Slightly slower, slightly lower.
- **CALLER** — you, to Ava. Normal, a bit distracted, like someone whose air conditioning
  just died.

Do not let them blur. A viewer who cannot tell which one they are hearing loses the
thread immediately.

---

## Pre-flight

**Cal.com timezone: already fixed.** The profile was `Asia/Singapore`, which rendered a
10am Chicago booking as *11:00pm — 1:00am* — the same instant, arithmetically correct, and
flatly contradicting the "ten to twelve in the morning" Ava had just said. It is now
`America/Chicago`, so TAB 5 is safe to show. Revert at
**app.cal.com/settings/my-account/general** when you are done if you use that account for
anything real. The availability schedule was always Chicago and is unaffected.

- `python scripts/reset-demo.py --apply`
- Mic permission already granted on `northwind-dispatch.vercel.app`
- Slack open on `#northwind-oncall`, scrolled to the bottom
- Gmail open, inbox, nothing unread above the fold
- Test already run and green in TAB 7 (it takes ~a minute; do not run it on camera)
- Browser zoom ~110%, Loom set to record the browser window

## Tabs

| # | Tab | URL |
| --- | --- | --- |
| 1 | Northwind (the widget) | northwind-dispatch.vercel.app |
| 2 | Dispatch board | northwind-dispatch.vercel.app/dispatch |
| 3 | Slack | `#northwind-oncall` |
| 4 | Gmail | your dispatch inbox |
| 5 | Cal.com | app.cal.com/bookings/upcoming |
| 6 | Supabase | table editor, `jobs` table |
| 7 | ElevenLabs Tests | elevenlabs.io/app/agents/`agent_4101…` → **Tests** tab |

Tabs 1 and 2 side by side for the call. Everything else is a switch.

---

## 0:00–0:20 · Cold open  → **TAB 1**

> **NARRATION:** "Northwind runs twelve trucks. Forty percent of their calls come in
> after hours, hit voicemail, and half those people call a competitor. This is Ava,
> their after-hours dispatcher."

Beat.

> "In production she's a phone number — Twilio won't sell a trial account one, so this is
> the web widget. Everything behind it is identical."

Say that last part evenly. It is a constraint, not a confession.

---

## 0:20–0:48 · Architecture, as a tab tour  → **1 → 2 → 5 → 6 → 1**

Not a diagram. Four real screens, about seven seconds each.

> **NARRATION:** "Orientation. **[TAB 1]** Customer side. **[TAB 2]** What dispatch sees.
> **[TAB 5]** A real Cal.com calendar. **[TAB 6]** Postgres underneath. One Next.js app
> serves all of it."

**→ back to TAB 1**, board visible alongside.

---

## 0:48–2:20 · Golden path  → **TABS 1 + 2 side by side**

**Budget ~85 seconds for this exchange.** It is the longest single thing in the video and
the only part whose length you cannot fully control. If a take runs past two minutes on
the call alone, stop and go again rather than trying to make it up later.

Start the widget. Then stop narrating — let it run.

> *Ava:* "Northwind Heating and Air, this is Ava. Hi Daryl — is this about the unit at
> 1400 Maple Ave?"

Let that land for a full second before you answer. It is the best moment in the video.

> **CALLER:** "Yeah, it is."
>
> *(she asks what's going on)*
>
> **CALLER:** "My air conditioner's down. I need someone out here to fix it."
>
> *(she asks how warm it's getting)*
>
> **CALLER:** "About thirty degrees Celsius."
>
> *(she acknowledges, moves toward scheduling)*
>
> **CALLER:** "And what's this going to cost me?"
>
> *(she quotes the after-hours diagnostic — $149 — from the knowledge base, and does not
> invent anything around it)*
>
> *(she confirms the address)*
>
> **CALLER:** "Yep, that's right."
>
> *(she offers two windows)*
>
> **CALLER:** "Ten to twelve works."
>
> *(she reads the window back)*
>
> **CALLER:** "Yeah, that's good."

She books. **Say nothing** while the board fills in — that silence is the payoff.

Then, one line only:

> **NARRATION:** "She knew who I was before she said a word. That lookup runs before the
> conversation starts — on a phone, while it's still ringing. The obvious alternative is
> to make it a tool she calls mid-conversation, but then she has to stall while it runs.
> That's where 'let me pull that up' and a second of silence come from."

---

## 2:20–2:50 · Proof it's real  → **3 → 4 → 5 → 6 → 1**

Quick. Six seconds a tab. You are answering "is any of this actually wired up?"

> **NARRATION:** "One tool call did all of this. **[TAB 3]** On-call paged in Slack.
> **[TAB 4]** Customer got a confirmation email. **[TAB 5]** It's on the real calendar.
> **[TAB 6]** And the row in Postgres — service type, urgency, booking id."

Then, still on the board, point at the scorecard:

> "That price came out of a RAG document — the pricing sheet is in her knowledge base.
> And 'no unsourced pricing' there is the guard on it: it fails any call where she quotes
> a figure that isn't in one of those documents."

Then the design point, which is the actual reason to show it:

> "That was one tool call, but only the calendar write made her wait. Slack and the email
> went out after she'd already answered. Wait on all three and the caller sits in silence
> for as long as the slowest one takes."

**→ TAB 1**

---

## 2:50–3:45 · The safety path  → **TAB 1**

**Budget ~55 seconds.** Shorter than the golden path — you are not booking anything, so
get to the gas line quickly once she has offered a window.

Fresh session. Reset first if you have time; if not, the board carrying one extra row is
survivable.

> **NARRATION:** "Everything so far is convenience — if booking breaks, someone waits
> longer for a technician. This one's different."

Start the session.

> **CALLER:** "Hi — my furnace has stopped and the house is freezing."
>
> *(let her triage and get as far as offering a window — this is the point)*
>
> **CALLER:** "Oh — and there's kind of a gas smell down there near the furnace."

She should abandon the booking mid-flow, deliver the evacuation script, and end the call.
Push once:

> **CALLER:** "Can't someone just come out and look at it?"

Then:

> **NARRATION:** "She'd already offered a window, and she dropped it. That's not the
> prompt asking nicely — it's a workflow node with no way out. A gas leak shouldn't be
> left to the model's judgment."

---

## 3:45–4:15 · The test  → **TAB 7**  ·  PICK ONE

**You cannot keep this in full and also keep the price beat.** Measured: with this segment
the video is **5:16**, sixteen seconds over the cap. Without it, **4:46**. Choose before
you record, not during.

**Option A — cut it (recommended).** Lands at 4:46 with fourteen seconds of slack. The
two-bugs story is in the README, which reviewers read. What you keep instead is the
knowledge base and the hallucination guard, which is the more distinctive thing: plenty of
candidates write a test, almost none express a hallucination guard as a pass/fail metric
tied to a RAG document.

**Option B — compress it to one sentence**, folded into the end of the safety segment
instead of its own tab. Lands around 4:53, seven seconds of slack. Say only:

> "There's an automated test pinning this path — it's what caught the two bugs that made
> it work."

**Option C — keep it in full and cut the price beat instead.** Only if you would rather
show engineering rigour than platform features. I would not: RAG is a core part of the
product you are demoing to its own team.

The full version follows, for Option C.

**Do not run it live.** A simulation test takes about a minute to settle. Hit run on
camera and you get a spinner and dead air. Open **TAB 7** on the last completed run — it
is green, with all five conditions listed — and talk over it.

No terminal, no second display: it is a browser tab like everything else, and showing the
platform's own testing surface reads better to this audience than a curl would.

> **NARRATION:** "There's an automated test pinning that path. The simulated caller
> mentions gas two turns in and pushes twice for an appointment. It asserts she evacuates
> and books nothing."

Beat.

> "It caught two bugs I'd never have found reading the graph — hazards raised mid-call
> weren't routing at all, and the safety node never got to speak."

If you kept the failing-run screenshot, two seconds here. If not, the sentence carries it
on its own — do not stall looking for the file.

---

## 4:15–4:37 · Close  → **TAB 2**

Land on the board.

> **NARRATION:** "Cuts, deliberately: no phone number — that's Twilio's trial, not a
> design choice. No auth on the board. Single technician calendar. No job-status lookup —
> scoped, then cut, because the demo never shows it."

> "The phone path is a config change, not a rewrite — it's built and tested already.
> Thanks for watching."

---

## If it runs long

Drop in this order:

1. **TAB 4, the email** in the proof tour. Slack already makes the same point. (~4s)
2. **The failing-test screenshot.** Say it instead of showing it. (~3s)
3. **TAB 5 and 6** in the architecture tour — two tabs, not four. (~6s)
4. **The whole test segment**, if you had not already taken Option A. ~30s, the single
   biggest saving available.
5. **The second half of the fan-out explanation** — "Wait on all three and the caller sits
   in silence." Keep the first half; the point survives. (~7s)

Do not cut the three explanations wholesale. They are the only places the video says *why*
any of this was built the way it was, and for this audience that is the entire content.
Everything else is just showing that it runs.

Do not cut the pause after the personalized greeting, and do not cut the silence while
the board fills in. Those two silences are doing more work than any sentence here.
