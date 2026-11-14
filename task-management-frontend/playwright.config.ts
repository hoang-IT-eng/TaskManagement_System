import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run the real stack: the .NET API on :5090 with a throwaway SQLite file seeded with
 * demo data, and the Vite dev server on :5174 proxying /api to it. Build the API first
 * (`dotnet build TaskManagement.API`). Set CHROME_PATH to use a system Chrome instead of Playwright's.
 */
const api = 'http://localhost:5090';
const web = 'http://localhost:5174';
const dbFile = '/tmp/layers-e2e.db';
const executablePath = process.env.CHROME_PATH;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: web,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, testMatch: /mobile/ },
  ],
  webServer: [
    {
      command: `rm -f ${dbFile}* && dotnet ../TaskManagement.API/bin/Debug/net10.0/TaskManagement.API.dll --urls ${api}`,
      cwd: '../TaskManagement.API',
      url: `${api}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__Default: `Data Source=${dbFile}`,
        RateLimiting__AuthPermitPerMinute: '1000',
        Cors__Origins__0: web,
      },
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      url: web,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { LAYERS_API: api },
    },
  ],
});
