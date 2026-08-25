Pricing is no longer a knowledge-base document.

It lives in the `pricing` table (`supabase/migrations/0002_pricing.sql`) and is served by
the `get_pricing` tool. RAG is a similarity match over prose; a price is an exact lookup
with one right answer, and when retrieval misses it fails silently — the agent finds no
figure and says something plausible while knowing nothing.

Keeping a copy here would recreate the exact problem the move was meant to solve: two
sources of truth for the same numbers, drifting apart the first time someone edits one.

The evaluation criterion is generated from the table by `agent/sync-pricing-criterion.py`.
