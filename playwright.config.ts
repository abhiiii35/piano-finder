import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "DATABASE_URL=file:./test.db NEXTAUTH_SECRET=test-secret-e2e npx next dev --port 3001",
    port: 3001,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
  },
});
