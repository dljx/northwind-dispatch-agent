-- Northwind Dispatch Agent — demo seed
-- Ref: docs/superpowers/specs/2026-08-25-northwind-dispatch-agent-design.md §7 step 2
--
-- Fill in your own number before running. It must be E.164 and must match the phone you
-- will dial from, or the personalized-open beat — the best thing in the build — will not
-- fire. On a Twilio trial that same number also has to be a verified caller ID.

insert into customers (phone, name, email, service_address, service_plan) values
  ('+1XXXXXXXXXX', 'Daryl Lee',   'you@example.com',   '1400 Maple Ave, Edina, MN 55424',      'Comfort Plan'),
  ('+16125550118', 'Rosa Delgado', null,               '812 Girard Ave N, Minneapolis, MN 55411', null),
  ('+16125550193', 'Tom Whitaker', 'tom@example.com',  '3355 Xerxes Ave S, Minneapolis, MN 55416', 'Comfort Plan');

-- One open job, so the board is not empty on the first take and the "board fills in"
-- beat has something to fill in against.
insert into jobs (customer_id, service_type, urgency, issue_summary, scheduled_for, status, idempotency_key)
select id,
       'hvac_no_heat',
       'routine',
       'Furnace short-cycling, runs about ten minutes then stops.',
       now() + interval '1 day',
       'scheduled',
       'seed:whitaker-001'
from customers where phone = '+16125550193';
