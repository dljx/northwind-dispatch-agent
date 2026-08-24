# Knowledge base

Three documents, uploaded to the ElevenLabs agent with RAG enabled.

**Upload these three only:**

- `01-service-area.md`
- `02-pricing.md`
- `03-policies.md`

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

## Pricing figures are load-bearing twice

Every dollar amount in `02-pricing.md` is also inlined into the `no_unsourced_pricing`
evaluation criterion, because evaluation criteria receive the transcript and their own
prompt — not the knowledge base — and so cannot check a figure against a document they
never see.

That means the two have to be edited together. If you change a price here and not in the
criterion, the criterion starts failing correct answers, which is worse than not having
it: a red scorecard on screen that is wrong about why.
