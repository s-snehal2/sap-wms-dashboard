import { redirect } from "next/navigation";

import { getMe } from "@/lib/server/auth";
import UsersPanel from "@/components/admin/Userspanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users & roles — SAP/WMS Command Center" };

export default async function UsersPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/"); // only admins manage users
  return <UsersPanel me={me} />;
}
