import { supabase } from '@/lib/supabase';
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OPSCORE Employee Portal",
    short_name: "OPSCORE",
    description:
      "Employee portal for attendance, approvals, leave, payslips, announcements, and profile.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/opscore-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/opscore-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/opscore-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}


