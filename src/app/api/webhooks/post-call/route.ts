import "server-only";
import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { db } from "@/lib/supabase";
import { optionalEnv, requireEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Post-call webhook — spec §3.1. Drives the dispatch board.
 *
 * Unlike conversation-init, this one IS signed by the platform:
 * `ElevenLabs-Signature: t=<unix>,v0=<hmac-sha256>`, with the timestamp inside the
 * signed message and a 30-minute replay window. Verification goes through the SDK's
 * constructEvent rather than a hand-rolled HMAC — the header format is not in the
 * docs, and a verifier written against a guessed format is one that accepts
 * everything.
 */

type PostCallEvent = {
  type?: string;
  data?: {
    conversation_id?: string;
    metadata?: { call_duration_secs?: number };
    analysis?: {
      transcript_summary?: string;
      data_collection_results?: unknown;
      evaluation_criteria_results?: unknown;
    };
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, unknown>;
    };
  };
};

export async function POST(req: Request) {
  const signature = req.headers.get("elevenlabs-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }

  // Raw body, not req.json(). The signature covers the exact bytes sent; parsing and
  // re-serialising first would change them.
  const rawBody = await req.text();

  let event: PostCallEvent;
  try {
    const client = new ElevenLabsClient({
      apiKey: optionalEnv("ELEVENLABS_API_KEY", "webhook-only"),
    });
    event = (await client.webhooks.constructEvent(
      rawBody,
      signature,
      requireEnv("ELEVENLABS_WEBHOOK_SECRET"),
    )) as PostCallEvent;
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (event.type !== "post_call_transcription") {
    // Other event types are not errors. 200 so the platform stops retrying.
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const data = event.data;
  const conversationId = data?.conversation_id;
  if (!conversationId) {
    return NextResponse.json({ error: "missing conversation_id" }, { status: 400 });
  }

  // Set during the ring by /api/conversation-init and handed back here, which is why
  // calls.customer_id needs no second lookup. Empty for unknown callers.
  const rawCustomerId = data?.conversation_initiation_client_data?.dynamic_variables
    ?.customer_id;
  const customerId =
    typeof rawCustomerId === "string" && rawCustomerId.length > 0 ? rawCustomerId : null;

  // Upsert, not insert. Webhook delivery retries, and a retry must not produce a
  // second row for one conversation.
  const { error } = await db()
    .from("calls")
    .upsert(
      {
        conversation_id: conversationId,
        customer_id: customerId,
        transcript_summary: data?.analysis?.transcript_summary ?? null,
        data_collection: data?.analysis?.data_collection_results ?? null,
        evaluation: data?.analysis?.evaluation_criteria_results ?? null,
        duration_secs: data?.metadata?.call_duration_secs ?? null,
      },
      { onConflict: "conversation_id" },
    );

  if (error) {
    // 500 so the platform retries. The upsert makes that safe.
    console.error("post-call persist failed", {
      conversationId,
      message: error.message,
    });
    return NextResponse.json({ error: "persist failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
