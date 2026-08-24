"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The board has to fill in while the reviewer is watching — that is the beat at the
 * end of the golden path (§5), and a board that needs a manual reload kills it.
 *
 * router.refresh() re-runs the server component and swaps in new data without a
 * navigation or a full reload, so the page does not flash and scroll position holds.
 * Data fetching stays on the server, which matters here: the service role key must
 * never reach the browser.
 */
export function AutoRefresh({ seconds = 3 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
