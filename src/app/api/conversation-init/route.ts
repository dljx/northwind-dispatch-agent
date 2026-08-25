import "server-only";
import { NextResponse } from "next/server";
import { hasValidSecret } from "@/lib/auth";
import { resolveCaller, unknownCaller, type Resolved } from "@/lib/caller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Conversation initiation webhook — spec §3.1.
 *
 * This runs while the phone is still ringing, before the agent's first word. That is
 * the whole point: the customer lookup costs nothing the caller can hear, where the
 * same lookup as a mid-call tool would produce "let me pull that up" and dead air.
 *
 * The resolution itself lives in @/lib/caller because the widget page needs it too.
 *
 * Three settings must all be true for this to have any effect, and each fails silently
 * to the generic greeting — see docs/provisioned-resources.md:
 *   - the workspace conversation-init webhook URL
 *   - enable_conversation_initiation_client_data_from_webhook (agent)
 *   - overrides.conversation_config_override.agent.first_message (agent)
 */

type InitRequest = { caller_id?: string };

function respond({ variables, firstMessage }: Resolved) {
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
    return respond(unknownCaller(""));
  }

  return respond(await resolveCaller(callerId));
}
