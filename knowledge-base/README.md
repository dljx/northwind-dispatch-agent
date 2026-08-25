# Knowledge base

Three documents, uploaded to the ElevenLabs agent with RAG enabled.

**Upload these two only:**

- `01-service-area.md`
- `03-policies.md`

`02-pricing.md` is a tombstone, not a document. Pricing moved to the `pricing` table and
the `get_pricing` tool — see the file for why.

This README is not part of the knowledge base. Do not upload it — anything in the RAG
index is retrievable, so notes-about-the-notes end up quotable by the agent.

## Two things deliberately absent

**The hazard script is not in here.** Gas smell, carbon monoxide and sounding alarms are
handled by a fixed script in the workflow, before triage (§4.2). RAG retrieval is a
similarity match, not a guarantee; a path that must fire every single time cannot depend
on a document being retrieved. Putting the script here would also give the agent room to
paraphrase it, which is the one thing that must not happen on that path.

**Availability is not in here.** Policy belongs in the knowledge base, state belongs in
tools (§4.3). A schedule baked into a RAG document is a demo that lies to customers next
Tuesday.

## Why pricing left

Every dollar amount had to be inlined into the `no_unsourced_pricing` criterion, because
criteria see the transcript and their own prompt — never the knowledge base. Two copies of
the same numbers, kept in sync by hand, is a guard that starts failing correct answers the
first time someone edits one of them.

Numbers that must be duplicated to be checked want to be structured data. Pricing is now a
table, and `agent/sync-pricing-criterion.py` generates the criterion from it, so there is
one source and one command.
