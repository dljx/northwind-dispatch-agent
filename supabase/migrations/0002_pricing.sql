-- Pricing moves out of the knowledge base and into a table.
--
-- The knowledge base was the wrong home for this. RAG is a similarity match over prose;
-- a price is an exact lookup on a small key set with exactly one right answer, and its
-- failure mode when retrieval misses is silence rather than an error — the agent simply
-- never finds a figure and says something reasonable while knowing nothing.
--
-- The tell was the evaluation criterion: it had to inline all sixteen figures verbatim,
-- because the evaluator cannot read the knowledge base. Numbers that have to be
-- duplicated to be checked want to be structured data.
--
-- Service area and policies stay in RAG. Those are genuinely prose: judgment-requiring,
-- no single retrievable right answer. That is what RAG is for.

create table pricing (
  id                uuid primary key default gen_random_uuid(),
  key               text unique not null,
  category          text not null
    check (category in ('diagnostic', 'repair', 'membership', 'travel')),
  label             text not null,
  -- Money in cents. Whole dollars would read more easily in this table and would be
  -- wrong the first time anyone charges $89.50.
  amount_low_cents  int  not null,
  amount_high_cents int,             -- null when the price is fixed rather than a range
  unit              text,            -- 'visit', 'month', or null
  service_type      text
    check (service_type is null or service_type in
          ('hvac_no_heat','hvac_no_cool','plumbing_leak','plumbing_clog','other')),
  note              text,
  sort_order        int  not null default 100,
  active            boolean not null default true
);

create index on pricing (category) where active;

comment on table pricing is
  'Single source of truth for every figure the agent may quote. agent/sync-pricing.py '
  'regenerates the no_unsourced_pricing evaluation criterion from this table, so the '
  'guard and the prices cannot drift apart by hand-editing one of them.';

insert into pricing (key, category, label, amount_low_cents, amount_high_cents, unit, service_type, note, sort_order) values
  ('diagnostic_standard',    'diagnostic', 'Standard diagnostic fee',       8900,  null, 'visit', null, 'Mon-Fri 8am-5pm. Credited toward the repair if approved the same visit.', 10),
  ('diagnostic_after_hours', 'diagnostic', 'After-hours diagnostic fee',   14900,  null, 'visit', null, 'Evenings, weekends and holidays. Credited toward the repair if approved the same visit.', 20),
  ('travel_extended_area',   'travel',     'Travel fee, extended area',     4500,  null, 'visit', null, 'Charged once per visit, not per hour. Waived for Comfort Plan members.', 30),
  ('comfort_plan',           'membership', 'Comfort Plan',                  1900,  null, 'month', null, 'Waives diagnostic and travel fees, two tune-ups a year, 15% off repairs, priority scheduling.', 40),
  ('repair_capacitor',       'repair',     'Capacitor replacement',        15000, 30000, null, 'other',         null, 50),
  ('repair_ignitor',         'repair',     'Ignitor or flame sensor',      20000, 40000, null, 'hvac_no_heat',  null, 60),
  ('repair_blower_motor',    'repair',     'Blower motor',                 45000, 90000, null, 'hvac_no_heat',  null, 70),
  ('repair_heat_exchanger',  'repair',     'Heat exchanger',              120000,300000, null, 'hvac_no_heat',  null, 80),
  ('repair_refrigerant',     'repair',     'AC refrigerant leak repair',   40000,150000, null, 'hvac_no_cool',  null, 90),
  ('repair_water_heater',    'repair',     'Water heater replacement',    140000,280000, null, 'plumbing_leak', null, 100),
  ('repair_drain_clearing',  'repair',     'Drain clearing',               17500, 40000, null, 'plumbing_clog', null, 110),
  ('repair_fixture',         'repair',     'Toilet or faucet repair',      15000, 45000, null, 'plumbing_leak', null, 120);

alter table pricing enable row level security;
