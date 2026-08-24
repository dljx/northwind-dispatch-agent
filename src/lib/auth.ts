import "server-only";
import { timingSafeEqual } from "node:crypto";
import { requireEnv } from "./env";

const HEADER = "x-northwind-secret";

/**
 * Shared-secret check for the routes ElevenLabs calls that it does not sign.
 *
 * The post-call webhook is HMAC-signed by the platform and verified with the SDK.
 * /api/conversation-init and /api/tools/* are not signed at all, so this header is
 * the only thing in front of them — and conversation-init in particular takes a
 * phone number and returns a name and a home address.
 *
 * timingSafeEqual over a plain === so the comparison does not leak the secret one
 * byte at a time. It throws on length mismatch, hence the length guard first.
 */
export function hasValidSecret(req: Request): boolean {
  const provided = req.headers.get(HEADER);
  if (!provided) return false;

  const expected = requireEnv("TOOL_SHARED_SECRET");
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export const SECRET_HEADER = HEADER;
