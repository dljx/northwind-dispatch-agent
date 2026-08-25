# Demo script

Word for word, with tab cues. Target **4:45** against a hard 5:00 cap.

Narration is ~145 seconds of it, measured. The two live conversations are the other ~140, and they
are the part you do not control — so the narration is written tight on purpose. Read it
as written and you land around 4:45. Improvise an extra sentence per segment and you are
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
- Terminal on the second display, in the repo, `.env.local` sourced
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

> **NARRATION:** "Quick orientation. **[TAB 1]** Customer side — one page, one widget.
> **[TAB 2]** What dispatch sees. **[TAB 5]** A real Cal.com calendar. **[TAB 6]** Postgres
> underneath. One Next.js app on Vercel serves all of it plus the routes the agent calls."

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

> **NARRATION:** "That greeting was resolved before the session opened — on a phone, the
> same endpoint runs while the line is still ringing. The alternative is a lookup tool,
> and that's where 'let me pull that up' comes from."

---

## 2:20–2:50 · Proof it's real  → **3 → 4 → 5 → 6 → 1**

Quick. Six seconds a tab. You are answering "is any of this actually wired up?"

> **NARRATION:** "One tool call did all of this. **[TAB 3]** On-call paged in Slack.
> **[TAB 4]** Customer got a confirmation email. **[TAB 5]** It's on the real calendar.
> **[TAB 6]** And the row in Postgres — service type, urgency, booking id."

Then the design point, which is the actual reason to show it:

> "Only the calendar write is awaited. Slack and the email fire after the response goes
> back — three vendors in series inside a live call is where dead air comes from."

**→ TAB 1**

---

## 2:50–3:45 · The safety path  → **TAB 1**

**Budget ~55 seconds.** Shorter than the golden path — you are not booking anything, so
get to the gas line quickly once she has offered a window.

Fresh session. Reset first if you have time; if not, the board carrying one extra row is
survivable.

> **NARRATION:** "Now the one that matters."

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
> prompt asking nicely — it's a workflow node with no outgoing edges. There's no path back
> to booking. A gas leak shouldn't be left to the model's judgment."

---

## 3:45–4:15 · Production posture  → **TERMINAL**

Run the test (curl is in the runbook).

> **NARRATION:** "There's an automated test pinning that path — the caller mentions gas
> two turns in and pushes twice for an appointment. It asserts she evacuates and books
> nothing."

Beat.

> "It earned its place — it caught two bugs I'd never have found reading the graph.
> Hazards raised mid-call weren't routing at all, and the safety node never got to speak,
> because its outgoing edge fired the moment it was entered."

If you have the failing-run screenshot, show it here for two seconds.

---

## 4:15–4:37 · Close  → **TAB 2**

Land on the board.

> **NARRATION:** "Cuts, deliberately: no phone number — that's Twilio's trial, not a
> design choice. No auth on the board. Single technician calendar. No job-status lookup —
> scoped, then cut, because the demo never shows it."

> "The phone path is a config change, not a rewrite: the webhook and the lookup are
> already built and tested. Thanks for watching."

---

## If it runs long

Drop in this order:

1. **TAB 4, the email** in the proof tour. Slack already makes the same point.
2. **The failing-test screenshot.** Say it instead of showing it.
3. **TAB 5 and 6** in the architecture tour — do it with two tabs, not four.

Do not cut the pause after the personalized greeting, and do not cut the silence while
the board fills in. Those two silences are doing more work than any sentence here.
