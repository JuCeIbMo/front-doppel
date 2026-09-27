import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** The origin of a public URL variable, or nothing when it is unset (then it is same-origin). */
function originOf(value: string | undefined): string[] {
  if (!value) return [];
  try {
    return [new URL(value).origin];
  } catch {
    return [];
  }
}

const api = originOf(process.env.NEXT_PUBLIC_API_URL);
const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseSocket = supabase.map((origin) => origin.replace(/^http/, "ws"));
// The Facebook SDK loads from connect.facebook.net, talks to *.facebook.com and opens the
// Embedded Signup popup and its iframes there; its images come from fbcdn.
const facebook = ["https://*.facebook.com", "https://*.facebook.net"];

const contentSecurityPolicy = [
  ["default-src", "'self'"],
  // Next.js inlines its bootstrap scripts; React needs eval only in development.
  ["script-src", "'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), "https://connect.facebook.net"],
  ["style-src", "'self'", "'unsafe-inline'"],
  // Product photos and WhatsApp media are signed Supabase Storage links; a picked photo is a blob.
  ["img-src", "'self'", "data:", "blob:", ...supabase, ...facebook, "https://*.fbcdn.net"],
  ["media-src", "'self'", "blob:", ...supabase],
  ["font-src", "'self'", "data:"],
  ["connect-src", "'self'", ...api, ...supabase, ...supabaseSocket, ...facebook, ...(isDev ? ["ws:"] : [])],
  ["frame-src", ...facebook],
  ["worker-src", "'self'", "blob:"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
  ["frame-ancestors", "'none'"],
  // Only where nothing is served over plain http, such as a local API.
  ...(!isDev && api.every((origin) => origin.startsWith("https:")) ? [["upgrade-insecure-requests"]] : []),
]
  .map((directive) => directive.join(" "))
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
