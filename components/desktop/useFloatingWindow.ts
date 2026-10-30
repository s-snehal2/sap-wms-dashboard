"use client";
import { useCallback, useEffect, useState } from "react";

/* Document Picture-in-Picture (Chrome / Edge 116+) isn't in TypeScript's DOM lib yet. */
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
      window: Window | null;
    };
  }
}

/** Copy every stylesheet from the dashboard into the new window so Tailwind classes work there. */
function copyStyles(src: Document, dst: Document) {
  for (const sheet of Array.from(src.styleSheets)) {
    try {
      const el = dst.createElement("style");
      el.textContent = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      dst.head.appendChild(el);
    } catch {
      if (sheet.href) {
        const link = dst.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        dst.head.appendChild(link);
      }
    }
  }
}

/**
 * Opens a small separate window that React can render into via a portal.
 * - Chrome / Edge: a Document Picture-in-Picture window — stays on top of every other app on the desktop.
 * - Other browsers: a normal small popup window (not always-on-top).
 */
export function useFloatingWindow() {
  const [win, setWin] = useState<Window | null>(null);

  const close = useCallback(() => {
    setWin((w) => {
      w?.close();
      return null;
    });
  }, []);

  const open = useCallback(async (): Promise<"pip" | "popup" | "blocked"> => {
    let w: Window | null = null;
    let mode: "pip" | "popup" = "popup";
    if (window.documentPictureInPicture) {
      try {
        w = await window.documentPictureInPicture.requestWindow({ width: 360, height: 540 });
        mode = "pip";
      } catch {
        w = null;
      }
    }
    if (!w) w = window.open("", "sap-wms-pins", "popup,width=360,height=560");
    if (!w) return "blocked";

    w.document.title = "🔨 Pinned — SAP/WMS";
    w.document.body.innerHTML = "";
    copyStyles(document, w.document);
    w.document.documentElement.className = document.documentElement.className;
    w.document.documentElement.style.colorScheme = document.documentElement.style.colorScheme;
    w.addEventListener("pagehide", () => setWin(null), { once: true });
    setWin(w);
    return mode;
  }, []);

  // Keep the floating window's light/dark theme in sync with the dashboard.
  useEffect(() => {
    if (!win) return;
    const sync = () => {
      win.document.documentElement.className = document.documentElement.className;
      win.document.documentElement.style.colorScheme = document.documentElement.style.colorScheme;
    };
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => mo.disconnect();
  }, [win]);

  // Close the floating window when the dashboard tab goes away.
  useEffect(() => {
    if (!win) return;
    const bye = () => win.close();
    window.addEventListener("pagehide", bye);
    return () => window.removeEventListener("pagehide", bye);
  }, [win]);

  return { win, open, close };
}
