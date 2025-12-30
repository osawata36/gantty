import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Playwright E2E Test Configuration
 *
 * Ganttyアプリケーションの基本的なユーザーストーリーを検証するE2Eテスト設定。
 *
 * 設計方針:
 * - UIの正常系動作のみをテスト（網羅的なケースは避ける）
 * - Tauri APIはモックし、ファイル操作はスキップ
 * - 不安定なテストを避けるため、シンプルなシナリオに限定
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tauri APIモックスクリプトを読み込み（エクスポート用、fixturesで読み込む）
const tauriMockScript = fs.readFileSync(
  path.join(__dirname, "e2e", "tauri-mock.js"),
  "utf-8"
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // 安定性のため並列実行を無効化
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // ローカルでも1回リトライ
  workers: 1, // 安定性のため単一ワーカー
  reporter: [["html"], ["list"]],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // ページ読み込み前にTauri APIをモック
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contextOptions: {
      // ページが読み込まれる前にスクリプトを実行
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

// Export the mock script for use in tests
export { tauriMockScript };
