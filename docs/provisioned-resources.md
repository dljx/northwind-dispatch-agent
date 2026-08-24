# Provisioned resources

Non-secret identifiers for everything standing up behind this demo. Secrets live in
`.env.local` (gitignored) and in Vercel's production environment.

## Vercel

| | |
| --- | --- |
| Project | `northwind-dispatch` (`prj_PZOILnZTXkk8q6tbuhqvRBO0yzVS`) |
| Production URL | https://northwind-dispatch.vercel.app |

Deploys are CLI-driven from a local checkout (`vercel --prod`), not git-linked.

`ssoProtection` is set to `all_except_custom_domains`, yet the production alias serves
publicly and the API routes return our own 401 rather than an SSO redirect — verified by
request, not assumed. Worth re-checking after any project settings change: if protection
ever starts applying to the production alias, both webhooks fail with an HTML login page
and nothing in the app logs will say so.

## Endpoints for the ElevenLabs webhook configuration

```
conversation-init   https://northwind-dispatch.vercel.app/api/conversation-init
post-call           https://northwind-dispatch.vercel.app/api/webhooks/post-call
```

Both require the header `x-northwind-secret` (value in `.env.local` as
`TOOL_SHARED_SECRET`). The post-call route additionally verifies the platform's HMAC
signature; conversation-init cannot, because ElevenLabs does not sign it.

## Supabase

| | |
| --- | --- |
| Project ref | `jbsdiopounznzlsczbaz` |
| URL | https://jbsdiopounznzlsczbaz.supabase.co |

Migration `0001_init.sql` applied. RLS enabled with no policies on all three tables —
verified by request: the publishable key returns `[]` for `customers`, the service role
key returns rows.

Seeded: `+15551234567` (Daryl Lee, Comfort Plan, 1400 Maple Ave) plus two filler
customers and one open job so the board is not empty on the first take.

## ElevenLabs

| | |
| --- | --- |
| Agent | `agent_4101m0tmxbskew3ref0cm9p37qm3` — "Ava - Northwind After-Hours Dispatch" |
| LLM | `gemini-2.5-flash` (platform default) |
| Voice | `EXAVITQu4vr4xnSDxMaL` — Sarah, stability 0.4, speed 1.0 |

Knowledge base, RAG enabled, `usage_mode: auto`:

| Document | ID |
| --- | --- |
| `northwind-01-service-area` | `h8oQIzK8l4ky59r3sXaN` |
| `northwind-02-pricing` | `DGlYeZze6iQxsctyct0d` |
| `northwind-03-policies` | `uK2jr0IpzK32Xf0j85Nt` |

Six data collection fields and four evaluation criteria are configured and were confirmed
present on a read-back after creation.

## Cal.com

| | |
| --- | --- |
| Account | `<your-cal-username>` |
| Schedule | `2279724` — "Northwind Dispatch (Chicago)", America/Chicago, Mon–Sat 08:00–18:00, **not** the account default |
| Event type | `6799125` — "Northwind Service Visit", 120 min, `slotInterval` 120, 60 min notice, location `attendeeAddress` |

The account's own timezone is Asia/Singapore. The dedicated schedule exists because
querying slots in `America/Chicago` against the default schedule returned 9pm–1am
appointments — correct arithmetic, unusable demo. With this schedule the windows come
back as 8–10am, 10–12pm, 12–2pm, 2–4pm, 4–6pm Central.

API versions differ per endpoint and are not interchangeable:

```
/v2/slots      cal-api-version: 2024-09-04
/v2/bookings   cal-api-version: 2024-08-13
/v2/event-types cal-api-version: 2024-06-14
/v2/schedules  cal-api-version: 2024-06-11
```

`POST /v2/bookings` returns `data.uid` (a string like `q2H7ZVgW1sb2HZkw3r8HKe`) — that is
what belongs in `jobs.cal_booking_id`, not the numeric `data.id`.

## Credentials to rotate after recording

All of these were pasted into a chat transcript:

- Supabase personal access token (`sbp_…`) — **highest priority**, account-level access to every project
- Vercel token (`vcp_…`) — account-wide, no project scoping
- Cal.com API key (`cal_live_…`)
- ElevenLabs API key (`sk_…`)
