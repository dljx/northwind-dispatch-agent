import "server-only";
import { db } from "./supabase";

/**
 * Caller resolution — the lookup that makes the personalized open possible.
 *
 * This lives here rather than inside the route handler because two surfaces need it:
 *
 *   /api/conversation-init  — inbound Twilio, called by ElevenLabs during the ring
 *   /                       — the widget page, which resolves server-side and hands the
 *                             result to the widget as dynamic variables
 *
 * Same function, same query, same greeting for both. The widget demo is therefore not a
 * mock of the phone path; it is the phone path's resolution logic reached over a
 * different transport. Worth being precise about that on camera: what the widget does
 * NOT exercise is the webhook round-trip itself, because there is no caller ID on a web
 * session for ElevenLabs to send.
 */

export const UNKNOWN_GREETING =
  "Northwind Heating and Air, this is Ava. What's going on with your system tonight?";

/**
 * The platform requires that dynamic_variables contains every variable the agent
 * declares — not merely the ones we happen to have. A missing key is a runtime error
 * mid-conversation, so unknown callers get the full set with empty values.
 */
export type DynamicVariables = {
  is_known_customer: string;
  customer_id: string;
  customer_name: string;
  service_address: string;
  service_plan: string;
  callback_number: string;
};

export type Resolved = {
  variables: DynamicVariables;
  firstMessage: string;
};

const LOOKUP_TIMEOUT_MS = 1_500;

export function unknownCaller(callbackNumber: string): Resolved {
  return {
    variables: {
      is_known_customer: "false",
      customer_id: "",
      customer_name: "",
      service_address: "",
      service_plan: "",
      callback_number: callbackNumber,
    },
    firstMessage: UNKNOWN_GREETING,
  };
}

/** "1400 Maple Ave, Edina, MN 55424" -> "1400 Maple Ave". Nobody says the ZIP aloud. */
function spokenAddress(address: string): string {
  return address.split(",")[0]?.trim() ?? address;
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

/**
 * Never throws. On the phone path this runs while the line is still ringing, so any
 * failure degrades to the generic greeting — a perfectly good conversation — rather
 * than returning an error into a live call.
 */
export async function resolveCaller(callerId: string): Promise<Resolved> {
  const phone = callerId.trim();
  if (!phone) return unknownCaller("");

  try {
    const { data, error } = await db()
      .from("customers")
      .select("id, name, service_address, service_plan")
      .eq("phone", phone)
      .abortSignal(AbortSignal.timeout(LOOKUP_TIMEOUT_MS))
      .maybeSingle();

    if (error || !data) return unknownCaller(phone);

    return {
      variables: {
        is_known_customer: "true",
        customer_id: data.id,
        customer_name: data.name,
        service_address: data.service_address,
        service_plan: data.service_plan ?? "",
        callback_number: phone,
      },
      // Resolved here rather than branched on in the prompt. The lookup already knows
      // the answer, so the model never gets the opportunity to improvise the
      // personalization failure the branch exists to prevent.
      firstMessage:
        `Northwind Heating and Air, this is Ava. Hi ${firstName(data.name)} — ` +
        `is this about the unit at ${spokenAddress(data.service_address)}?`,
    };
  } catch {
    return unknownCaller(phone);
  }
}
