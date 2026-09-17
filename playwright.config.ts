import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/** The API and Supabase the browser talks to during e2e; every call is mocked by the spec. */
export const E2E_API_URL = "http://api.e2e.test";
export const E2E_SUPABASE_URL = "https://e2e.supabase.co";

const browser = ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((path) => existsSync(path));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  webServer: {
    command: "npm run dev -- --port 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_API_URL: E2E_API_URL,
      NEXT_PUBLIC_SUPABASE_URL: E2E_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
    },
  },
  use: {
    baseURL: "http://localhost:3101",
    trace: "retain-on-failure",
    launchOptions: { executablePath: browser },
  },
});
