import Script from "next/script";
import { resolveCaller, unknownCaller } from "@/lib/caller";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The demo surface.
 *
 * In production Northwind's front door is a phone number, and the personalized open
 * comes from the conversation-initiation webhook firing on inbound caller ID before the
 * agent's first word. Twilio will not provision a number on a trial account, so this
 * page is the demo surface instead.
 *
 * It is not a mock of that path. The page calls resolveCaller — the same function the
 * webhook route calls, hitting the same table and producing the same greeting — and
 * hands the result to the widget as dynamic variables plus a first_message override.
 * What it does not exercise is the webhook round-trip itself, because a web session has
 * no caller ID for ElevenLabs to send. Say that out loud rather than letting anyone
 * assume otherwise.
 *
 *   /              signed-in customer (the seeded demo caller)
 *   /?caller=none  unknown caller, generic greeting
 *   /?caller=+65…  any other number
 */

// Which seeded customer the widget resolves. Configuration rather than a literal:
// this is a real personal number, and the repo is public.
const DEMO_CALLER = process.env.NORTHWIND_DEMO_CALLER ?? "";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ caller?: string }>;
}) {
  const { caller } = await searchParams;
  const agentId = requireEnv("ELEVENLABS_AGENT_ID");

  const resolved =
    caller === "none"
      ? unknownCaller("")
      : await resolveCaller(caller?.trim() || DEMO_CALLER);

  const known = resolved.variables.is_known_customer === "true";

  return (
    <div className="site">
      <header className="site-head">
        <div className="brand">
          <span className="mark">N</span>
          <div>
            <div className="brand-name">Northwind Heating &amp; Air</div>
            <div className="brand-sub">HVAC &amp; plumbing · Twin Cities metro</div>
          </div>
        </div>
        <div className="hours">
          <span className="dot" />
          After hours — dispatcher on duty
        </div>
      </header>

      <main className="hero">
        <h1>Furnace out? We answer at 2am.</h1>
        <p className="lede">
          Twelve trucks across the Twin Cities. No voicemail, no callback queue — talk to
          a dispatcher now and get a technician booked before you hang up.
        </p>

        <div className="panel">
          <div className="panel-head">
            {known ? (
              <>
                Signed in as <strong>{resolved.variables.customer_name}</strong>
                {resolved.variables.service_plan && (
                  <span className="plan">{resolved.variables.service_plan}</span>
                )}
              </>
            ) : (
              <>Not signed in</>
            )}
          </div>
          <div className="panel-body">
            {known ? (
              <>
                Service address on file:{" "}
                <strong>{resolved.variables.service_address}</strong>
              </>
            ) : (
              <>Ava will ask for your address and callback number.</>
            )}
          </div>
          <div className="panel-foot">
            Tap the widget to start. Ava triages the problem, checks the on-call
            schedule, and books the visit.
          </div>
        </div>

        <p className="fineprint">
          Emergency gas smell or carbon monoxide? Leave the building and call 911 and your
          gas utility before contacting us.
        </p>
      </main>

      <elevenlabs-convai
        agent-id={agentId}
        dynamic-variables={JSON.stringify(resolved.variables)}
        override-first-message={resolved.firstMessage}
      />
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
      />
    </div>
  );
}
