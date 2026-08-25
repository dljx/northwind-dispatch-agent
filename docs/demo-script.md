# Demo script

Word for word, with tab cues. Target **4:35** against a hard 5:00 cap.

Two voices in this recording and it matters that they sound different:

- **NARRATION** — you, to the viewer. Slightly slower, slightly lower.
- **CALLER** — you, to Ava. Normal, a bit distracted, like someone whose air conditioning
  just died.

Do not let them blur. A viewer who cannot tell which one they are hearing loses the
thread immediately.

---

## Pre-flight

**Fix the Cal.com timezone or do not open that tab.** Your Cal.com profile is
`Asia/Singapore`, so a 10am Chicago booking renders as *11:00pm — 1:00am*. It is the same
instant and it is arithmetically right, but on screen it flatly contradicts the "ten to
twelve in the morning" Ava just said. Change it at
**app.cal.com/settings/my-account/general → Timezone → America/Chicago**, or cut TAB 5.

Then:

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

> **NARRATION:** "Northwind Heating and Air runs twelve trucks across the Twin Cities.
> About forty percent of their calls come in after hours — those hit voicemail, and half
> those people just call a competitor. So this is Ava. She's the after-hours dispatcher."

Beat.

> "One thing up front: in production this is a phone number. Twilio won't sell a trial
> account one, so I'm demoing on the web widget. Same agent, same webhooks, same
> everything behind it — I'll show you the one thing that actually changes."

Say that last part evenly. It is a constraint, not a confession.

---

## 0:20–0:50 · Architecture, as a tab tour  → **1 → 2 → 5 → 6 → 1**

Not a diagram. Four real screens, about seven seconds each.

> **NARRATION:** "Quick orientation. **[TAB 1]** This is the customer side — one page, one
> widget. **[TAB 2]** This is what dispatch sees. **[TAB 5]** That's a real Cal.com
> calendar, not a mock. **[TAB 6]** And Postgres underneath. One Next.js app on Vercel
> serves the page, the board, and the four API routes the agent calls. That's the whole
> stack."

**→ back to TAB 1**, board visible alongside.

---

## 0:50–2:35 · Golden path  → **TABS 1 + 2 side by side**

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

> **NARRATION:** "That greeting was resolved before the session even opened — not fetched
> mid-conversation. On a phone the same endpoint runs while the line is still ringing.
> The alternative is a lookup tool, and that's exactly where 'let me pull that up' and
> dead air come from."

---

## 2:35–3:05 · Proof it's real  → **3 → 4 → 5 → 6 → 1**

Quick. Six seconds a tab. You are answering "is any of this actually wired up?"

> **NARRATION:** "One tool call did all of this. **[TAB 3]** On-call got paged in Slack.
> **[TAB 4]** The customer got a confirmation email. **[TAB 5]** It's on the real
> calendar. **[TAB 6]** And there's the row in Postgres — service type, urgency, the
> Cal.com booking id."

Then the design point, which is the actual reason to show it:

> "Only the calendar write is awaited. Slack and the email fire after the response goes
> back, so three vendors aren't sitting in series inside a call somebody's waiting on."

**→ TAB 1**

---

## 3:05–3:45 · The safety path  → **TAB 1**

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

> **NARRATION:** "She'd already offered a window and she dropped it. That's not the prompt
> asking nicely — it's a workflow node with no outgoing edges. Once the conversation is
> there, there's no path back to booking. Some things shouldn't be left to the model's
> judgment, and a gas leak is one of them."

---

## 3:45–4:15 · Production posture  → **TERMINAL**

> **NARRATION:** "Two quick things."

```bash
python scripts/... # or paste the run-tests curl from the runbook
```

> "There's an automated test pinning that path — the caller mentions gas two turns in and
> pushes twice for an appointment. It asserts she evacuates and books nothing."

Beat.

> "It earned its place. It caught two bugs I'd never have found by reading the graph:
> hazards raised mid-call weren't routing at all, and the safety node never got to speak
> because its outgoing edge fired the moment it was entered. Routing worked perfectly.
> The script was just never said."

If you have the failing-run screenshot, show it here for two seconds.

---

## 4:15–4:35 · Close  → **TAB 2**

Land on the board.

> **NARRATION:** "What I cut, deliberately: no phone number — that's Twilio's trial, not a
> design choice. No auth on the board. One technician's calendar instead of real
> round-robin. No job-status lookup — I scoped it, then cut it, because the demo never
> shows it."

> "Next would be the phone path, which is a config change rather than a rewrite — the
> webhook and the lookup are already built and tested — then round-robin across the twelve
> trucks. Thanks for watching."

---

## If it runs long

Drop in this order:

1. **TAB 4, the email** in the proof tour. Slack already makes the same point.
2. **The failing-test screenshot.** Say it instead of showing it.
3. **TAB 5 and 6** in the architecture tour — do it with two tabs, not four.

Do not cut the pause after the personalized greeting, and do not cut the silence while
the board fills in. Those two silences are doing more work than any sentence here.
