import { redirect } from "next/navigation";

import Dashboard from "@/components/Dashboard";
import { getMe } from "@/lib/server/auth";
import { loadAllFor, type AllData } from "@/lib/server/load";

// Always check the login on the server (never cache this page).
export const dynamic = "force-dynamic";

const EMPTY: AllData = { projects: [], notes: [], pins: [], remarks: [] };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/login");
  // Load everything here so the dashboard arrives already filled (no extra requests from the browser).
  let initial = EMPTY;
  try {
    initial = await loadAllFor(me);
  } catch (e) {
    console.error("Initial load failed — the dashboard will retry from the browser:", e);
  }
  return <Dashboard me={me} initial={initial} />;
}
