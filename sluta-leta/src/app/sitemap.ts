import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_BASE_URL ?? "https://sluta-leta.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/utforska", "/sok", "/hitta-kopare", "/plus", "/villkor", "/integritet", "/logga-in", "/registrera"];
  return routes.map((route) => ({
    url: `${APP_URL}${route}`,
    lastModified: new Date(),
  }));
}
