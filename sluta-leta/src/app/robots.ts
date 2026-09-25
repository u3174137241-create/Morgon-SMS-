import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_BASE_URL ?? "https://sluta-leta.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
