import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The public pages are for everyone; the Owner's panel and the demo's sample data are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/cashier", "/demo", "/connect/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
