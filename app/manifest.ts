import type { MetadataRoute } from "next";

/** Lets Chrome / Edge install the dashboard as a desktop app (own window, taskbar icon, Start-menu entry). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAP/WMS Command Center",
    short_name: "Command Center",
    description: "SAP / WMS project tracker with pinned priorities",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7f77dd",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
