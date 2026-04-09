import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Glow — Skincare Tracker",
    short_name: "Glow",
    description: "Your personal skincare routine tracker and product manager",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c4545a",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
