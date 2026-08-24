-- Northwind Dispatch Agent — initial schema
-- Ref: docs/superpowers/specs/2026-08-25-northwind-dispatch-agent-design.md §3.2

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

create table customers (
  id              uuid primary key default gen_random_uuid(),
  phone           text        unique not null,
  name            text        not null,
  email           text,
  service_address text        not null,
  service_plan    text,
  created_at      timestamptz not null default now()
);

comment on column customers.phone is
  'E.164, matching the caller_id ElevenLabs posts to /api/conversation-init (+16125550142). '
  'A number stored in any other format will not match and the caller silently falls through '
  'to the unknown-customer greeting.';

comment on column customers.email is
  'Where the booking confirmation is sent. Null for unknown callers, who get a verbal '
  'confirmation only — collecting an email by voice is worse than not having one.';

comment on column customers.service_plan is
  'Comfort Plan, or null for non-members. Drives the waived-diagnostic answer in the KB.';

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------

create table jobs (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references customers(id),
  service_type    text not null
    check (service_type in ('hvac_no_heat', 'hvac_no_cool',
                            'plumbing_leak', 'plumbing_clog', 'other')),
  urgency         text not null
    check (urgency in ('emergency', 'same_day', 'routine')),
  issue_summary   text,
  scheduled_for   timestamptz,
  cal_booking_id  text,
  status          text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  idempotency_key text        unique not null,
  created_at      timestamptz not null default now()
);

create index on jobs (customer_id);

comment on column jobs.idempotency_key is
  'conversation_id : slot_id, or conversation_id alone when an emergency booking has no '
  'slot. NOT NULL is load-bearing: Postgres permits unlimited nulls in a unique index, so '
  'a nullable key would silently protect nothing on exactly the path that matters most. '
  'The handler reads the existing row back on conflict and returns the original payload — '
  'raising a unique violation would fire the agent failure path and transfer a caller '
  'whose job was in fact booked.';

comment on constraint jobs_service_type_check on jobs is
  'The enum is declared twice on purpose. The tool schema stops the model inventing a '
  'category; this stops everything else — a hand-fixed row, a replayed webhook, a later '
  'script — from doing the same.';

-- ---------------------------------------------------------------------------
-- calls
-- ---------------------------------------------------------------------------

create table calls (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    text        unique not null,
  customer_id        uuid references customers(id),
  transcript_summary text,
  data_collection    jsonb,
  evaluation         jsonb,
  duration_secs      int,
  created_at         timestamptz not null default now()
);

comment on column calls.customer_id is
  'Resolved without an extra lookup: the post-call payload carries '
  'conversation_initiation_client_data.dynamic_variables, so the customer id set during '
  'the ring comes back at the end of the call.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Enabled with no policies, which denies everything. The app reaches these tables with
-- the service role key, which bypasses RLS entirely.
--
-- This is not the same cut as "no auth on the dispatch board" (§8). That cut makes one
-- page public. Leaving RLS off would make the whole PostgREST surface readable by anyone
-- holding the anon key — and the anon key ships to the browser the moment the board
-- queries Supabase directly. The board must read through a server route.

alter table customers enable row level security;
alter table jobs      enable row level security;
alter table calls     enable row level security;
