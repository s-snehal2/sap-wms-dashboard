"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Ban, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Pencil, Search, ShieldCheck, Trash2, UserPlus, Users, Wand2, X } from "lucide-react";

import { createUser, deleteUser, listUsers, setBlocked, setPassword, updateUser } from "@/app/actions/users";
import { defaultPassword } from "@/lib/password";
import type { Me, Role, UserRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const ROLE_INFO: Record<Role, { label: string; cls: string; help: string }> = {
  admin: { label: "Admin", cls: "bg-accent text-accent-foreground", help: "Sees and edits everything, manages users" },
  hod: { label: "HOD", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300", help: "Own work + views their team's work" },
  user: { label: "User", cls: "bg-bg3 text-fg2", help: "Own projects, notes and pins" },
};

const genPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const a = new Uint32Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "never";

const selectCls = "h-9 w-full rounded-md border border-border bg-bg2 px-2 text-[13px] outline-none focus:border-primary disabled:opacity-50";
const labelCls = "block text-[10px] font-semibold uppercase tracking-[.07em] text-fg3 mb-1";

function RoleBadge({ role }: { role: Role }) {
  return <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full", ROLE_INFO[role].cls)}>{role === "admin" && <ShieldCheck className="size-3" />}{ROLE_INFO[role].label}</span>;
}

function HodSelect({ value, onChange, hods, disabled, excludeId }: { value: string | null; onChange: (v: string | null) => void; hods: UserRow[]; disabled?: boolean; excludeId?: string }) {
  return (
    <select className={selectCls} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} disabled={disabled} aria-label="HOD">
      <option value="">— No HOD —</option>
      {hods
        .filter((h) => h.id !== excludeId)
        .map((h) => (
          <option key={h.id} value={h.id}>
            {h.fullName || h.email}
          </option>
        ))}
    </select>
  );
}

export default function UsersPanel({ me }: { me: Me }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  // add-user form
  const emptyForm = { fullName: "", email: "", empCode: "", password: "", role: "user" as Role, hodId: null as string | null };
  const [form, setForm] = useState(emptyForm);
  // Password follows the rule (name + code) until the admin types their own.
  const [pwCustom, setPwCustom] = useState(false);
  const rulePw = defaultPassword(form.fullName, form.empCode);
  const formPw = pwCustom ? form.password : rulePw;
  const [showPw, setShowPw] = useState(true);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  // per-row editing
  const [editing, setEditing] = useState<{ id: string; fullName: string; empCode: string; role: Role; hodId: string | null } | null>(null);
  const [resetting, setResetting] = useState<{ id: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listUsers();
      if (res.ok) setUsers(res.data);
      else toast.error(res.error);
    } catch {
      toast.error("Can't reach the server — refresh the page in a moment");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const hods = useMemo(() => users.filter((u) => u.role === "hod"), [users]);
  const shown = users.filter(
    (u) => (roleFilter === "all" || u.role === roleFilter) && (!query || `${u.fullName} ${u.email} ${u.empCode ?? ""} ${u.hodName ?? ""}`.toLowerCase().includes(query.toLowerCase()))
  );
  const counts = { all: users.length, admin: users.filter((u) => u.role === "admin").length, hod: hods.length, user: users.filter((u) => u.role === "user").length };

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => {
    setBusy(key);
    let res: { ok: boolean; error?: string };
    try {
      res = await fn();
    } catch {
      res = { ok: false, error: "Can't reach the server — nothing was changed. Try again in a moment." };
    }
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error ?? "Failed");
      return false;
    }
    toast.success(msg);
    await load();
    return true;
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPw) return void toast.error("Enter the name and employee code — the password is made from them");
    const done = await run("create", () => createUser({ ...form, password: formPw }), `${form.fullName || form.email} added as ${ROLE_INFO[form.role].label}`);
    if (done) {
      setCreated({ email: form.email.trim().toLowerCase(), password: formPw });
      setForm(emptyForm);
      setPwCustom(false);
    }
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success("Copied"));

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 h-[54px] border-b">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-fg2 hover:text-foreground">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <span className="text-fg3">/</span>
          <span className="text-[15px] font-semibold flex items-center gap-1.5">
            <Users className="size-4 text-primary" /> Users &amp; roles
          </span>
        </div>
        <span className="text-[11px] text-fg3">Signed in as {me.fullName} (admin)</span>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-6">
        {/* ── Add user ── */}
        <section className="bg-card border rounded-lg p-5">
          <h2 className="text-[13px] font-semibold flex items-center gap-1.5 mb-4">
            <UserPlus className="size-4 text-primary" /> Add a user
          </h2>
          <form onSubmit={submitNew} className="grid grid-cols-[1fr_1fr_1fr] gap-3 max-[900px]:grid-cols-1">
            <label>
              <span className={labelCls}>Full name</span>
              <Input className="bg-bg2" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Snehal Singh" required />
            </label>
            <label>
              <span className={labelCls}>Work email</span>
              <Input className="bg-bg2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" required />
            </label>
            <label>
              <span className={labelCls}>Employee code</span>
              <Input className="bg-bg2 uppercase" value={form.empCode} onChange={(e) => setForm({ ...form, empCode: e.target.value })} placeholder="e.g. EMP1023" required />
            </label>
            <label>
              <span className={labelCls}>Password {pwCustom ? "(custom)" : "(auto: 5 letters of name @ code)"}</span>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input
                    className="bg-bg2 pr-8 font-mono text-[12px]"
                    type={showPw ? "text" : "password"}
                    value={formPw}
                    placeholder="fills in from name + code"
                    onChange={(e) => {
                      setPwCustom(true);
                      setForm({ ...form, password: e.target.value });
                    }}
                    minLength={6}
                    required
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-fg3 hover:text-foreground" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {pwCustom && (
                  <Button type="button" variant="outline" size="icon" className="size-9" onClick={() => setPwCustom(false)} title="Go back to the name + code rule">
                    <Wand2 className="size-4" />
                  </Button>
                )}
              </div>
            </label>
            <label>
              <span className={labelCls}>Role</span>
              <select className={selectCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role, hodId: e.target.value === "admin" ? null : form.hodId })}>
                <option value="user">User — {ROLE_INFO.user.help}</option>
                <option value="hod">HOD — {ROLE_INFO.hod.help}</option>
                <option value="admin">Admin — {ROLE_INFO.admin.help}</option>
              </select>
            </label>
            <label>
              <span className={labelCls}>Reports to (HOD)</span>
              <HodSelect value={form.hodId} onChange={(v) => setForm({ ...form, hodId: v })} hods={hods} disabled={form.role === "admin"} />
            </label>
            <div className="flex items-end">
              <Button type="submit" className="w-full h-9" disabled={busy === "create"}>
                {busy === "create" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Create user
              </Button>
            </div>
          </form>
          {!hods.length && <p className="text-[11px] text-fg3 mt-2">No HODs yet — create one with role HOD, then you can pick them in “Reports to”.</p>}

          {created && (
            <div className="mt-4 rounded-md border border-primary/40 bg-accent/60 px-4 py-3 text-[12px] flex items-center gap-3 flex-wrap">
              <Check className="size-4 text-primary" />
              <span>
                Share these sign-in details with them (shown once): <strong>{created.email}</strong> / <code className="font-mono bg-background px-1.5 py-0.5 rounded">{created.password}</code>
              </span>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => copy(`Email: ${created.email}\nPassword: ${created.password}\nSign in: ${window.location.origin}/login`)}>
                <Copy className="size-3.5" /> Copy
              </Button>
              <button className="ml-auto text-fg3 hover:text-foreground" onClick={() => setCreated(null)} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          )}
        </section>

        {/* ── People ── */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex gap-1.5">
              {(["all", "admin", "hod", "user"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "text-[11px] px-3 py-1 rounded-full border border-border text-fg3 hover:border-primary",
                    roleFilter === r && "bg-accent text-accent-foreground border-primary font-semibold"
                  )}
                >
                  {r === "all" ? "Everyone" : ROLE_INFO[r].label} ({counts[r]})
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-fg3" />
              <input className="pl-7 pr-2.5 py-1.5 rounded-md border bg-bg2 text-xs w-[240px] outline-none focus:border-primary" placeholder="Search name, email, code, HOD…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="bg-card border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[12px]">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-[.06em] text-fg3">
                  <th className="px-3 py-2 font-semibold">Person</th>
                  <th className="px-3 py-2 font-semibold w-[130px]">Role</th>
                  <th className="px-3 py-2 font-semibold w-[190px]">Reports to</th>
                  <th className="px-3 py-2 font-semibold w-[90px]">Projects</th>
                  <th className="px-3 py-2 font-semibold w-[170px]">Status</th>
                  <th className="px-3 py-2 font-semibold w-[150px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const self = u.id === me.id;
                  const isEditing = editing?.id === u.id;
                  return (
                    <tr key={u.id} className={cn("border-b last:border-b-0 align-top", u.blocked && "opacity-60")}>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <Input className="h-8 bg-bg2 text-[12px]" value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} autoFocus />
                        ) : (
                          <div className="text-[13px] font-medium flex items-center gap-1.5">
                            {u.fullName || <span className="text-fg3 italic">No name</span>}
                            {self && <span className="text-[10px] px-1.5 rounded-full bg-accent text-accent-foreground">you</span>}
                          </div>
                        )}
                        {isEditing ? (
                          <Input className="h-8 bg-bg2 text-[12px] uppercase mt-1" value={editing.empCode} onChange={(e) => setEditing({ ...editing, empCode: e.target.value })} placeholder="Employee code" aria-label="Employee code" />
                        ) : (
                          u.empCode && <div className="text-[11px] font-mono text-fg2 mt-0.5">{u.empCode}</div>
                        )}
                        <div className="text-[11px] text-fg3 mt-0.5">{u.email}</div>
                        {u.role === "hod" && <div className="text-[10px] text-fg3 mt-0.5">Team: {u.teamSize} {u.teamSize === 1 ? "person" : "people"}</div>}
                        {resetting?.id === u.id && (
                          <div className="flex items-center gap-1 mt-2">
                            <Input className="h-8 bg-bg2 font-mono text-[12px]" value={resetting.password} onChange={(e) => setResetting({ ...resetting, password: e.target.value })} aria-label="New password" />
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={busy === u.id + "pw"}
                              onClick={async () => {
                                const pw = resetting.password;
                                if (await run(u.id + "pw", () => setPassword(u.id, pw), `Password changed for ${u.fullName || u.email}`)) {
                                  setResetting(null);
                                  setCreated({ email: u.email, password: pw });
                                }
                              }}
                            >
                              Save
                            </Button>
                            <button className="text-fg3 hover:text-foreground" onClick={() => setResetting(null)} aria-label="Cancel">
                              <X className="size-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <select className={selectCls} value={editing.role} disabled={self} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role, hodId: e.target.value === "admin" ? null : editing.hodId })}>
                            <option value="user">User</option>
                            <option value="hod">HOD</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {isEditing ? (
                          <HodSelect value={editing.hodId} onChange={(v) => setEditing({ ...editing, hodId: v })} hods={hods} disabled={editing.role === "admin"} excludeId={u.id} />
                        ) : (
                          <span className={u.hodName ? "" : "text-fg3"}>{u.hodName ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{u.projectCount}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("text-[11px] font-medium", u.blocked ? "text-status-danger-txt" : "text-status-done-txt")}>{u.blocked ? "Blocked" : "Active"}</span>
                        <div className="text-[10px] text-fg3">Last sign-in: {fmt(u.lastSignIn)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-[11px]"
                                disabled={busy === u.id}
                                onClick={async () => {
                                  if (await run(u.id, () => updateUser(editing), `${editing.fullName} updated`)) setEditing(null);
                                }}
                              >
                                {busy === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditing(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="outline" className="size-7" title="Edit name, role, HOD" onClick={() => setEditing({ id: u.id, fullName: u.fullName, empCode: u.empCode ?? "", role: u.role, hodId: u.hodId })}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="outline" className="size-7" title="Reset password (name + code rule)" onClick={() => setResetting({ id: u.id, password: defaultPassword(u.fullName, u.empCode ?? "") || genPassword() })}>
                                <KeyRound className="size-3.5" />
                              </Button>
                              {!self && (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className={cn("size-7", u.blocked && "bg-status-danger-bg")}
                                  title={u.blocked ? "Unblock — allow sign-in again" : "Block — stop sign-in, keep their data"}
                                  disabled={busy === u.id + "ban"}
                                  onClick={() => {
                                    if (!u.blocked && !confirm(`Block ${u.fullName || u.email}? They won't be able to sign in. Their projects stay.`)) return;
                                    run(u.id + "ban", () => setBlocked(u.id, !u.blocked), u.blocked ? "Unblocked" : "Blocked");
                                  }}
                                >
                                  <Ban className="size-3.5" />
                                </Button>
                              )}
                              {!self && (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-7 hover:bg-status-danger-bg hover:border-destructive hover:text-status-danger-txt"
                                  title="Delete user and everything they own"
                                  disabled={busy === u.id + "del"}
                                  onClick={() => {
                                    const warn = u.projectCount ? `\n\nThis also permanently deletes their ${u.projectCount} project(s), notes, pins and remarks. Consider "Block" instead.` : "";
                                    if (!confirm(`Delete ${u.fullName || u.email}?${warn}`)) return;
                                    run(u.id + "del", () => deleteUser(u.id), "User deleted");
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-fg3">
                      {loading ? "Loading…" : "No one matches."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-fg3 mt-2">
            HODs see their team&apos;s projects (view only). Admins see and edit everything. Changes apply the next time the person&apos;s dashboard refreshes.
          </p>
        </section>
      </div>
    </div>
  );
}
