import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Everything a reader sees is crawlable, including /play (the AdSense crawler
// needs it to match ads to the verdict page). API and sign-in routes aren't.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
