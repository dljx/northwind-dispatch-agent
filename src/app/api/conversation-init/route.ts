import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hasValidSecret } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Conversation initiation webhook — spec §3.1.
 *
 * This runs while the phone is still ringing, before the agent's first word. That is
 * the whole point: the customer lookup costs nothing the caller can hear, where the
 * same lookup as a mid-call tool would produce "let me pull that up" and dead air.
 *
 * Two consequences shape everything below.
 *
 * 1. It is on the critical path of the ring, so the lookup is bounded by a timeout.
 * 2. It must not fail the call. Any error short of a bad secret degrades to the
 *    unknown-caller greeting, which is a perfectly good conversation, rather than
 *    returning a 500 into a live phone call.
 */

const LOOKUP_TIMEOUT_MS = 1_500;

const UNKNOWN_GREETING =
  "Northwind Heating and Air, this is Ava. What's going on with your system tonight?";

type InitRequest = {
  caller_id?: string;
  agent_id?: string;
  called_number?: string;
  call_sid?: string;
};

/**
 * The platform requires that dynamic_variables contains every variable the agent
 * defines — not just the ones we happen to have. A missing key is a runtime error
 * mid-conversation, so unknown callers get the full set with empty values.
 */
type DynamicVariables = {
  is_known_customer: string;
  customer_id: string;
  customer_name: string;
  service_address: string;
  service_plan: string;
  callback_number: string;
};

function unknownCaller(callbackNumber: string): DynamicVariables {
  return {
    is_known_customer: "false",
    customer_id: "",
    customer_name: "",
    service_address: "",
    service_plan: "",
    callback_number: callbackNumber,
  };
}

/** "1400 Maple Ave, Edina, MN 55424" -> "1400 Maple Ave". Nobody says the ZIP aloud. */
function spokenAddress(address: string): string {
  return address.split(",")[0]?.trim() ?? address;
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

function respond(variables: DynamicVariables, firstMessage: string) {
  return NextResponse.json({
    type: "conversation_initiation_client_data",
    dynamic_variables: variables,
    conversation_config_override: {
      agent: { first_message: firstMessage },
    },
  });
}

export async function POST(req: Request) {
  if (!hasValidSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let callerId = "";
  try {
    const body = (await req.json()) as InitRequest;
    callerId = body.caller_id?.trim() ?? "";
  } catch {
    return respond(unknownCaller(""), UNKNOWN_GREETING);
  }

  if (!callerId) return respond(unknownCaller(""), UNKNOWN_GREETING);

  try {
    const { data, error } = await db()
      .from("customers")
      .select("id, name, service_address, service_plan")
      .eq("phone", callerId)
      .abortSignal(AbortSignal.timeout(LOOKUP_TIMEOUT_MS))
      .maybeSingle();

    if (error || !data) return respond(unknownCaller(callerId), UNKNOWN_GREETING);

    const variables: DynamicVariables = {
      is_known_customer: "true",
      customer_id: data.id,
      customer_name: data.name,
      service_address: data.service_address,
      service_plan: data.service_plan ?? "",
      callback_number: callerId,
    };

    // The greeting is resolved here rather than branched on in the prompt. The
    // webhook already knows the answer, so the model never gets the opportunity to
    // improvise the personalization failure the branch exists to prevent.
    const greeting =
      `Northwind Heating and Air, this is Ava. Hi ${firstName(data.name)} — ` +
      `is this about the unit at ${spokenAddress(data.service_address)}?`;

    return respond(variables, greeting);
  } catch {
    // Timeout, network, anything. A generic greeting beats a failed call.
    return respond(unknownCaller(callerId), UNKNOWN_GREETING);
  }
}
