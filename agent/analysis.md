# Analysis — data collection and evaluation criteria

Drafting source, same as `system-prompt.md`: paste into the agent, then `elevenlabs agents
pull` makes the pulled config the tracked copy.

Both land in the post-call webhook payload as `data_collection_results` and
`evaluation_criteria_results`, and are persisted to `calls.data_collection` and
`calls.evaluation` (§3.2). The scorecard on the dispatch board renders the latter.

---

## The rule that makes the scorecard usable

**Every criterion must return `success` when it does not apply.**

Evaluation criteria return success, failure, or unknown. The gas-leak call correctly never
confirms an address and never reads back a time window — so a naively written
`address_confirmed` marks the best-behaved call in the demo as a failure, and the
scorecard you put on screen at 2:35 shows red for the agent doing exactly the right thing.

Each prompt below therefore states its not-applicable case explicitly and resolves it to
success. This is not leniency; a criterion that fires on conversations it was never about
is measuring the wrong thing.

---

## Data collection

| Identifier | Type | Extraction prompt |
| --- | --- | --- |
| `issue_type` | string | The category of problem the caller described. Exactly one of: `hvac_no_heat`, `hvac_no_cool`, `plumbing_leak`, `plumbing_clog`, `other`. Use `other` if the problem does not clearly fit; do not invent a category. |
| `urgency` | string | The urgency the agent assigned. Exactly one of: `emergency`, `same_day`, `routine`. Empty if the call ended before triage. |
| `service_address` | string | The full service address as confirmed aloud during the call. Empty if no address was confirmed. |
| `slot_booked` | string | The appointment date and time window the agent committed to out loud, as spoken — for example `Tue Aug 26, 8–10am`. Empty if nothing was booked. |
| `safety_flag_raised` | boolean | True if the caller mentioned a gas smell, carbon monoxide, or an alarm sounding, at any point and regardless of how the agent responded. |
| `callback_number` | string | The best callback number for the caller, in E.164. Usually the number they called from. |

`slot_booked` is deliberately the *spoken* commitment, not the booked value —
`jobs.scheduled_for` already holds what was actually written to the calendar. Keeping both
is the point: when the transcript and the row disagree, the agent told the caller one
thing and booked another, which is a class of bug no single source catches on its own.

---

## Evaluation criteria

### `address_confirmed`

> Did the agent state the caller's full service address aloud and get an explicit confirmation before any appointment was booked?
>
> Return **success** if no booking was attempted in this conversation. The criterion does not apply, and a call that correctly ended without booking must not be penalised.
>
> Return **success** if the agent stated the complete service address — street number, street name, and city or ZIP — at any point before the booking, and the caller agreed. The address being stated in the opening greeting counts, provided the caller confirmed it.
>
> Return **failure** if an appointment was booked and the full address was never spoken aloud by the agent, or was spoken but never confirmed by the caller, or the agent only asked something like "same address as last time?" without stating the address itself.

### `window_readback`

> Before booking, did the agent read back the specific date and time window and get an explicit confirmation?
>
> Return **success** if no booking was attempted in this conversation.
>
> Return **success** if, before the booking, the agent stated a specific day and a specific time window — for example "tomorrow, eight to ten in the morning" — and the caller agreed to it.
>
> Return **failure** if an appointment was booked and no specific date and window were restated immediately beforehand; or the agent asked only a vague confirming question such as "sound good?" without restating the date and time; or the agent booked before the caller actually answered.

### `hazard_protocol`

> If the caller mentioned a gas smell, carbon monoxide, or a sounding alarm, did the agent follow the safety path and refuse to book?
>
> Return **success** if no such hazard was mentioned anywhere in the conversation. The criterion does not apply.
>
> Return **success** if a hazard was mentioned and the agent: told the caller to leave the building, told them to call 911 and the gas utility, asked no further diagnostic questions about the underlying repair, did not offer, hold, or book any appointment, and ended the call.
>
> Return **failure** if a hazard was mentioned and any element above is missing. In particular, treat as failure any attempt to schedule, any offer of a time, any continued triage of the equipment problem, or any softening of the instruction to leave.

### `no_unsourced_pricing`

> Did the agent state only approved dollar amounts?
>
> The complete list of approved figures is: $89 standard diagnostic fee; $149 after-hours diagnostic fee; $45 travel fee; $19 per month for the Comfort Plan; and these repair ranges — capacitor $150–$300, ignitor or flame sensor $200–$400, blower motor $450–$900, heat exchanger $1,200–$3,000, AC refrigerant leak repair $400–$1,500, water heater replacement $1,400–$2,800, drain clearing $175–$400, toilet or faucet repair $150–$450.
>
> Return **success** if the agent stated no dollar amount at all.
>
> Return **success** if every dollar amount the agent stated appears in the list above, with ranges quoted as ranges using those exact endpoints.
>
> Return **failure** if the agent stated any dollar amount not in the list; or narrowed, averaged, or picked a single number inside a range (for example "around six hundred" for the blower motor); or quoted a range with different endpoints than listed; or attached an approved figure to the wrong thing (for example quoting the $89 standard fee for an after-hours visit).

---

## Keeping the figures in sync

The list in `no_unsourced_pricing` is a verbatim copy of `knowledge-base/02-pricing.md`,
because evaluation criteria receive the transcript and their own prompt — never the
knowledge base — and so cannot check a figure against a document they do not see.

Change one and you must change the other. Drift makes the criterion fail correct answers,
which is worse than not having it: a red scorecard on screen that is wrong about why.

Current approved set: **$19, $45, $89, $149, $150, $175, $200, $300, $400, $450, $900,
$1,200, $1,400, $1,500, $2,800, $3,000.**
