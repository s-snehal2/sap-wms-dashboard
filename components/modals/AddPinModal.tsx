"use client";
import { useState } from "react";
import { Pin, Search } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Hammer, StatusBadge } from "../ui";

interface Props {
  projects: Project[];
  isPinned: (pid: string) => boolean;
  onPick: (pid: string) => void;
  onClose: () => void;
}

export default function AddPinModal({ projects, isPinned, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const lq = q.toLowerCase();
  const shown = projects.filter((p) => !lq || `${p.name} ${p.pid} ${p.type} ${p.plant} ${p.status}`.toLowerCase().includes(lq));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="size-3.5" /> Pin a Project
          </DialogTitle>
        </DialogHeader>
        <div className="mb-3 text-xs text-fg2">Select a project to pin for priority monitoring. Already pinned projects are marked.</div>
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-fg3" />
          <Input className="bg-bg2 pl-7" placeholder="Filter projects…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <ScrollArea className="max-h-[300px] mb-4">
          <div className="flex flex-col gap-1">
            {shown.map((p) => {
              const pinned = isPinned(p.pid);
              return (
                <div
                  key={p.pid}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-md border transition-colors",
                    pinned ? "opacity-60 cursor-not-allowed bg-amber-50/60 dark:bg-amber-500/5" : "cursor-pointer hover:border-primary hover:bg-accent"
                  )}
                  onClick={pinned ? undefined : () => onPick(p.pid)}
                  role="button"
                  tabIndex={pinned ? -1 : 0}
                  onKeyDown={(e) => !pinned && e.key === "Enter" && onPick(p.pid)}
                >
                  <Checkbox checked={pinned} disabled={pinned} tabIndex={-1} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground overflow-hidden text-ellipsis whitespace-nowrap" title={p.name}>
                      {p.name}
                    </div>
                    <div className="text-[10px] text-fg3 mt-px">
                      {p.pid} · {p.type} · {p.plant} · {p.status}
                    </div>
                  </div>
                  {pinned ? (
                    <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300"><Hammer /> Pinned</span>
                  ) : (
                    <StatusBadge status={p.status} />
                  )}
                </div>
              );
            })}
            {!shown.length && <div className="text-center py-8 text-fg3 text-[13px]">No projects match “{q}”.</div>}
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
