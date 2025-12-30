import { test as base, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * E2E Test Fixtures
 *
 * Tauri APIをモックし、ブラウザのみでテストを実行できるようにします。
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tauri APIモックスクリプトを読み込み
const tauriMockScript = fs.readFileSync(
  path.join(__dirname, "tauri-mock.js"),
  "utf-8"
);

/**
 * Custom test fixture that injects Tauri API mocks before each page load
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // ページが読み込まれる前にTauri APIをモック
    await page.addInitScript(tauriMockScript);
    await use(page);
  },
});

export { expect };

/**
 * Helper: プロジェクトを作成するヘルパー関数
 * テストの前提条件として新規プロジェクトを作成する
 */
export async function createProject(
  page: ReturnType<typeof test.page extends Promise<infer T> ? () => T : never>,
  projectName: string = "テストプロジェクト"
) {
  await page.goto("/");
  // ページが完全に読み込まれるまで待機
  await page.waitForLoadState("networkidle");

  // 新規プロジェクト作成ボタンをクリック
  await page.getByRole("button", { name: /新規プロジェクト作成/i }).click();

  // ダイアログが表示されるまで待機
  await expect(page.getByRole("dialog")).toBeVisible();

  // プロジェクト名を入力して作成
  await page.getByPlaceholder("プロジェクト名").fill(projectName);
  await page.getByRole("button", { name: "作成" }).click();

  // ダイアログが閉じるのを待機
  await expect(page.getByRole("dialog")).not.toBeVisible();

  // タスクリストが表示されるまで待機
  await expect(page.getByText("タスクがありません")).toBeVisible();
}

/**
 * Helper: タスクを追加するヘルパー関数
 */
export async function addTask(
  page: ReturnType<typeof test.page extends Promise<infer T> ? () => T : never>,
  taskName: string
) {
  // タスクを追加ボタンをクリック
  await page.getByRole("button", { name: /タスクを追加/i }).last().click();

  // タスク名を入力してEnter
  const input = page.getByPlaceholder("タスク名を入力");
  await expect(input).toBeVisible();
  await input.fill(taskName);
  await page.keyboard.press("Enter");

  // タスクが表示されるまで待機
  await expect(page.getByText(taskName)).toBeVisible();
}
