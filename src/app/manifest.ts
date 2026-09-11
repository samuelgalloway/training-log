import type { MetadataRoute } from "next";

// Lets Android/Chrome offer "Add to Home Screen" / install, and gives the
// installed icon a real name + standalone window (no browser chrome) instead
// of opening as just another browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Training Log",
    short_name: "Training Log",
    description: "Personal lifting logger and plate calculator.",
    start_url: "/today",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#f7f6f3",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
