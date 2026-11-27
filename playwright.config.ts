import { defineConfig } from '@playwright/test';

/**
 * Teste ponta a ponta: o backoffice de verdade (`ng serve`) falando com a API de
 * verdade em `localhost:8080` (Docker). No CI, o job sobe a API da versão fixada
 * em `contract.version` antes de rodar.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4200',
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    // Na máquina, usa o Chrome instalado; no CI, o Chromium do Playwright.
    ...(process.env['CI'] ? {} : { channel: 'chrome' }),
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
