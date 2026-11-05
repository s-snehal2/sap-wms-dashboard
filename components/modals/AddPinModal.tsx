
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
import { StatusBadge } from "../ui";

interface Props {
  projects: Project[];
  isPinned: (pid: string) => boolean;
  onPick: (pid: string) => void;
  onClose: () => void;
}

export default function AddPinModal({
  projects,
  isPinned,
  onPick,
  onClose,
}: Props) {
  const [q, setQ] = useState("");

  const shown = projects.filter((p) =>
    `${p.name} ${p.pid} ${p.type} ${p.plant} ${p.status}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
   <DialogContent className="flex flex-col w-[calc(100%-2rem)] sm:max-w-[560px] max-h-[85dvh] overflow-hidden">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="size-4 shrink-0" />
            Pin a Project
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-fg2">
          Select a project to pin for priority monitoring.
          Already pinned projects are marked.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-fg3" />

          <Input
            className="pl-8 bg-bg2"
            placeholder="Filter projects..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>

        {/* Project List */}
        <ScrollArea className="h-[320px] max-h-[45vh] w-full min-w-0">
          <div className="flex flex-col gap-2">

            {shown.map((p) => {
              const pinned = isPinned(p.pid);

              return (
                <div
                  key={p.pid}
                  onClick={() => !pinned && onPick(p.pid)}
                  className={cn(
                    "flex w-full box-border items-center gap-0 rounded-md border p-2 min-w-0",
                    pinned
                      ? "bg-amber-50/50 opacity-70 dark:bg-amber-500/5"
                      : "cursor-pointer hover:bg-accent hover:border-primary"
                  )}
                >
                  <Checkbox
                    checked={pinned}
                    disabled={pinned}
                    className="shrink-0"
                  />

                  {/* Project Details */}
                  <div className="flex-1 min-w-0  pl-2 overflow-hidden">
                    <p
                      className="w-full text-xs font-normal truncate"
                      title={p.name}
                    >
                      {p.name}
                    </p>

                    <p className="w-full text-[10px] text-fg3 mt-1 truncate">
                      {p.pid} · {p.type} · {p.plant} · {p.status}
                    </p>
                  </div>

                  {/* Status */}
              <div className="mr-4 shrink-0 whitespace-nowrap">
                    {pinned ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        Pinned
                      </span>
                    ) : (
                      <StatusBadge status={p.status} />
                    )}
                  </div>
                </div>
              );
            })}

            {shown.length === 0 && (
              <p className="text-center py-8 text-xs text-fg3">
                No projects match.
              </p>
            )}

          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end border-t pt-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
