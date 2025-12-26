import { test, expect, createProject, addTask } from "./fixtures";

/**
 * Gantty E2E Tests - Basic Workflow
 *
 * 基本的なユーザーワークフローの正常系動作を検証するE2Eテスト。
 *
 * 設計方針:
 * - UIの基本機能の動作確認に限定
 * - 網羅的なケースは避け、主要なハッピーパスのみをテスト
 * - 詳細な分岐テストはインテグレーションテスト（Vitest）で実施
 * - Tauriのファイルダイアログ操作はスキップ（メモリ上での操作のみ）
 */

test.describe("基本ワークフロー: プロジェクトとタスクの操作", () => {
  test("新規プロジェクトを作成してタスクを追加・編集・削除できる", async ({
    page,
  }) => {
    // 1. アプリを起動し、空の状態が表示されることを確認
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("プロジェクトが開かれていません")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /新規プロジェクト作成/i })
    ).toBeVisible();

    // 2. 新規プロジェクトを作成
    await page.getByRole("button", { name: /新規プロジェクト作成/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByPlaceholder("プロジェクト名").fill("E2Eテストプロジェクト");
    await page.getByRole("button", { name: "作成" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("タスクがありません")).toBeVisible();

    // 3. タスクを追加
    await page.getByRole("button", { name: /タスクを追加/i }).click();
    await page.getByPlaceholder("タスク名を入力").fill("最初のタスク");
    await page.keyboard.press("Enter");

    await expect(page.getByText("最初のタスク")).toBeVisible();

    // 4. タスクをクリックして詳細パネルを開く
    await page.locator("li").first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText("タスク詳細")).toBeVisible();

    // 5. 詳細パネルでタスク名を編集
    const taskNameInput = page.locator('[role="dialog"]').getByLabel("タスク名");
    await taskNameInput.fill("編集後のタスク");

    // パネルを閉じる
    await page.keyboard.press("Escape");

    // 変更が反映されていることを確認
    await expect(page.getByText("編集後のタスク")).toBeVisible();

    // 6. タスクを削除
    await page.getByRole("button", { name: /削除/i }).click();
    await expect(page.getByText("タスクがありません")).toBeVisible();
  });

  test("タスクの階層構造（親子関係）を作成できる", async ({ page }) => {
    // プロジェクトを作成
    await createProject(page, "階層テスト");

    // 親タスクを追加
    await addTask(page, "親タスク");

    // サブタスクを追加
    const parentRow = page.locator("li").filter({ hasText: "親タスク" }).first();
    await parentRow.getByRole("button", { name: /サブタスクを追加/i }).click();

    await page.getByPlaceholder("サブタスク名を入力").fill("子タスク1");
    await page.keyboard.press("Enter");

    // 親と子タスクが表示されることを確認
    await expect(page.getByText("親タスク")).toBeVisible();
    await expect(page.getByText("子タスク1")).toBeVisible();

    // 折りたたみボタンをクリック
    const collapseButton = page
      .locator("li")
      .nth(0)
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    await collapseButton.click();

    // 子タスクが非表示になることを確認
    await expect(page.getByText("子タスク1")).not.toBeVisible();

    // 展開ボタンをクリック
    const expandButton = page
      .locator("li")
      .first()
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    await expandButton.click();

    // 子タスクが再表示されることを確認
    await expect(page.getByText("子タスク1")).toBeVisible();
  });
});

test.describe("基本ワークフロー: メンバー管理とタスク割り当て", () => {
  test("メンバーを追加してタスクに割り当てられる", async ({ page }) => {
    // プロジェクトを作成
    await createProject(page, "メンバーテスト");

    // メンバー管理ダイアログを開く
    await page.getByRole("button", { name: "メンバー管理" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("メンバーがいません")).toBeVisible();

    // メンバーを追加
    await page.getByPlaceholder("メンバー名を入力").fill("田中太郎");
    await page.getByRole("button", { name: "追加" }).click();

    await expect(page.getByText("田中太郎")).toBeVisible();

    // ダイアログを閉じる
    await page.getByRole("button", { name: "閉じる" }).click();

    // タスクを追加
    await addTask(page, "割り当てテストタスク");

    // タスクをクリックして詳細パネルを開く
    await page.locator("li").first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 責任者を選択
    await page.getByTestId("responsible-select").click();
    await page.getByRole("option", { name: "田中太郎" }).click();

    // パネルを閉じる
    await page.keyboard.press("Escape");

    // 責任者バッジが表示されることを確認
    await expect(page.getByTestId("responsible-badge-0")).toContainText(
      "田中太郎"
    );
  });
});

test.describe("基本ワークフロー: ビュー切り替え", () => {
  test("リストビューとガントビューを切り替えられる", async ({ page }) => {
    // プロジェクトを作成
    await createProject(page, "ビューテスト");

    // タスクを追加
    await addTask(page, "ビューテストタスク");

    // ガントビューに切り替え
    await page.getByRole("button", { name: "Gantt" }).click();

    // ガントチャートの要素が表示されることを確認
    await expect(page.getByTestId("gantt-task-list")).toBeVisible();
    await expect(page.getByTestId("gantt-chart-area")).toBeVisible();

    // タスク名がガントチャートに表示されることを確認
    await expect(page.getByTestId("gantt-task-list")).toContainText(
      "ビューテストタスク"
    );

    // リストビューに戻る
    await page.getByRole("button", { name: "List" }).click();

    // リストビューでタスクが表示されることを確認
    await expect(page.locator("li")).toContainText("ビューテストタスク");
  });
});

test.describe("基本ワークフロー: ガントチャートのスケール切り替え", () => {
  test("日/週/月/四半期の表示スケールを切り替えられる", async ({ page }) => {
    // アプリを起動（デフォルトプロジェクトが自動作成される）
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // タスクを追加
    await addTask(page, "スケールテストタスク");

    // タスクに日付を設定
    await page.evaluate(() => {
      const store = (window as unknown as { __projectStore?: { getState: () => { project: { tasks: { id: string }[] }; updateTask: (id: string, data: { startDate: string; endDate: string }) => void } } }).__projectStore;
      if (store) {
        const state = store.getState();
        const taskId = state.project.tasks[0].id;
        store.getState().updateTask(taskId, {
          startDate: "2025-01-10",
          endDate: "2025-03-20",
        });
      }
    });

    // ガントビューに切り替え
    await page.getByRole("button", { name: "Gantt" }).click();
    await expect(page.getByTestId("gantt-chart-area")).toBeVisible();

    // デフォルトは日表示（exactでマッチ）
    const dayButton = page.getByRole("button", { name: "日", exact: true });
    await expect(dayButton).toHaveClass(/bg-primary/);

    // 週表示に切り替え
    const weekButton = page.getByRole("button", { name: "週", exact: true });
    await weekButton.click();
    await expect(weekButton).toHaveClass(/bg-primary/);
    await expect(dayButton).not.toHaveClass(/bg-primary/);

    // 月表示に切り替え
    const monthButton = page.getByRole("button", { name: "月", exact: true });
    await monthButton.click();
    await expect(monthButton).toHaveClass(/bg-primary/);
    await expect(weekButton).not.toHaveClass(/bg-primary/);

    // 四半期表示に切り替え
    const quarterButton = page.getByRole("button", { name: "四", exact: true });
    await quarterButton.click();
    await expect(quarterButton).toHaveClass(/bg-primary/);
    await expect(monthButton).not.toHaveClass(/bg-primary/);

    // 四半期ヘッダー（Q1〜Q4）が表示されることを確認
    await expect(page.getByTestId("gantt-timeline-header")).toContainText("Q1");

    // 日表示に戻す
    await dayButton.click();
    await expect(dayButton).toHaveClass(/bg-primary/);
    await expect(quarterButton).not.toHaveClass(/bg-primary/);
  });

  test("「今日」ボタンで現在日にスクロールできる", async ({ page }) => {
    // アプリを起動（デフォルトプロジェクトが自動作成される）
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // タスクを追加
    await addTask(page, "今日ボタンテストタスク");

    // タスクに日付を設定（今日を含む範囲）
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14);

    await page.evaluate(({ start, end }) => {
      const store = (window as unknown as { __projectStore?: { getState: () => { project: { tasks: { id: string }[] }; updateTask: (id: string, data: { startDate: string; endDate: string }) => void } } }).__projectStore;
      if (store) {
        const state = store.getState();
        const taskId = state.project.tasks[0].id;
        store.getState().updateTask(taskId, {
          startDate: start,
          endDate: end,
        });
      }
    }, { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) });

    // ガントビューに切り替え
    await page.getByRole("button", { name: "Gantt" }).click();
    await expect(page.getByTestId("gantt-chart-area")).toBeVisible();

    // 「今日」ボタンをクリック
    await page.getByRole("button", { name: "今日" }).click();

    // 今日の日付ラインが表示されていることを確認
    await expect(page.getByTestId("gantt-today-line")).toBeVisible();
  });
});

test.describe("基本ワークフロー: ガントチャートでのドラッグ編集", () => {
  test("ガントチャートでタスクバーが表示され、ドラッグ可能な状態になる", async ({ page }) => {
    // プロジェクトを作成してタスクを追加
    await createProject(page, "ドラッグテスト");
    await addTask(page, "ドラッグタスク");

    // Zustandストアを直接操作してタスクに日付を設定
    await page.evaluate(() => {
      const store = (window as unknown as { __projectStore?: { getState: () => { project: { tasks: { id: string }[] }; updateTask: (id: string, data: { startDate: string; endDate: string }) => void } } }).__projectStore;
      if (store) {
        const state = store.getState();
        const taskId = state.project.tasks[0].id;
        store.getState().updateTask(taskId, {
          startDate: "2025-01-10",
          endDate: "2025-01-20",
        });
      }
    });

    // ガントビューに切り替え
    await page.getByRole("button", { name: "Gantt" }).click();

    // タスクバーが表示されることを確認
    const taskBar = page.getByTestId("gantt-task-bar-0");
    await expect(taskBar).toBeVisible();

    // バーにカーソルが設定されていることを確認（ドラッグ可能な状態）
    const cursor = await taskBar.evaluate((el) =>
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe("grab");
  });

  test("バーの端をドラッグして期間を変更できる", async ({ page }) => {
    // プロジェクトを作成してタスクを追加
    await createProject(page, "リサイズテスト");
    await addTask(page, "リサイズタスク");

    // Zustandストアを直接操作してタスクに日付を設定
    await page.evaluate(() => {
      const store = (window as unknown as { __projectStore?: { getState: () => { project: { tasks: { id: string }[] }; updateTask: (id: string, data: { startDate: string; endDate: string }) => void } } }).__projectStore;
      if (store) {
        const state = store.getState();
        const taskId = state.project.tasks[0].id;
        store.getState().updateTask(taskId, {
          startDate: "2025-01-10",
          endDate: "2025-01-25",
        });
      }
    });

    // ガントビューに切り替え
    await page.getByRole("button", { name: "Gantt" }).click();

    // タスクバーが表示されることを確認
    const taskBar = page.getByTestId("gantt-task-bar-0");
    await expect(taskBar).toBeVisible();

    // バーの位置を取得
    const barBox = await taskBar.boundingBox();
    expect(barBox).not.toBeNull();

    if (barBox) {
      const originalWidth = barBox.width;
      const rightEdgeX = barBox.x + barBox.width - 5;
      const centerY = barBox.y + barBox.height / 2;

      // バーの右端をドラッグして期間を延長
      await page.mouse.move(rightEdgeX, centerY);
      await page.mouse.down();
      await page.mouse.move(rightEdgeX + 80, centerY, { steps: 10 });
      await page.mouse.up();

      // ドラッグ後もバーが表示されていることを確認
      await expect(taskBar).toBeVisible();

      // バーの幅が変わったことを確認
      const newBarBox = await taskBar.boundingBox();
      expect(newBarBox).not.toBeNull();
      if (newBarBox) {
        expect(newBarBox.width).toBeGreaterThan(originalWidth);
      }
    }
  });
});
