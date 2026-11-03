"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "./schema";

export type LoginState = {
  error: string | null;
};

export async function loginAction(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials")) return { error: "Wrong email or password." };
    if (msg.includes("banned")) return { error: "Your access has been blocked — please contact your admin." };
    if (msg.includes("email not confirmed")) return { error: "Please confirm your email first — check your inbox." };
    return { error: error.message };
  }

  redirect("/");
}
