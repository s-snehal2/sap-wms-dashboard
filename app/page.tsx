import { redirect } from "next/navigation";

import Dashboard from "@/components/Dashboard";
import { getMe } from "@/lib/server/auth";

// Always check the login on the server (never cache this page).
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await getMe();
  if (!me) redirect("/login");
  return <Dashboard me={me} />;
}
