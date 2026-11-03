"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Me } from "@/lib/types";

const ROLE_LABEL = { admin: "Admin", hod: "HOD", user: "User" } as const;

const initials = (me: Me) =>
  (me.fullName || me.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Avatar in the header: who's signed in, their role, sign out. */
export default function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="size-8 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center hover:ring-2 hover:ring-primary/30"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        title={me.fullName}
      >
        {initials(me)}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-60 rounded-lg border bg-popover shadow-lg p-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[13px] font-semibold truncate">{me.fullName}</div>
          <div className="text-[11px] text-fg3 truncate">{me.email}</div>
          <div className="text-[11px] text-fg2 mt-1.5">
            {ROLE_LABEL[me.role]}
            {me.role === "hod" && " · sees their team (view only)"}
            {me.role === "admin" && " · sees and edits everything"}
          </div>
          <div className="border-t my-2.5" />
          {me.role === "admin" && (
            <Link href="/admin/users" className="flex items-center gap-1.5 text-[12px] text-fg2 hover:text-foreground mb-2">
              <Users className="size-3.5" /> Users &amp; roles
            </Link>
          )}
          <button onClick={signOut} className="inline-flex items-center gap-1.5 text-[12px] text-fg2 hover:text-foreground">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
