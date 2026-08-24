import { redirect } from "next/navigation";

// Nothing lives at the root. The marketing page was cut (spec §8) — the widget
// cannot show the personalized open, so it is a strictly worse surface than the
// phone. The board is the only page.
export default function Home() {
  redirect("/dispatch");
}
