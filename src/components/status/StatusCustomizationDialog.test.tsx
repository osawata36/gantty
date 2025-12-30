import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusCustomizationDialog } from "./StatusCustomizationDialog";
import { useProjectStore } from "@/stores/projectStore";

describe("StatusCustomizationDialog", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.getState().createNewProject("テストプロジェクト");
  });

  describe("ダイアログの表示", () => {
    it("openがtrueの時にダイアログが表示される", () => {
      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText("ステータス設定")).toBeInTheDocument();
    });

    it("openがfalseの時にダイアログが表示されない", () => {
      render(
        <StatusCustomizationDialog open={false} onOpenChange={vi.fn()} />
      );

      expect(screen.queryByText("ステータス設定")).not.toBeInTheDocument();
    });
  });

  describe("ステータス一覧表示", () => {
    it("デフォルトステータスが一覧に表示される", () => {
      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText("未対応")).toBeInTheDocument();
      expect(screen.getByText("処理中")).toBeInTheDocument();
      expect(screen.getByText("レビュー待ち")).toBeInTheDocument();
      expect(screen.getByText("完了")).toBeInTheDocument();
    });
  });

  describe("ステータス追加", () => {
    it("名前を入力して追加ボタンをクリックするとステータスが追加される", async () => {
      const user = userEvent.setup();
      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      const idInput = screen.getByPlaceholderText("ID（英数字）");
      await user.type(idInput, "blocked");

      const nameInput = screen.getByPlaceholderText("ステータス名");
      await user.type(nameInput, "ブロック中");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      const state = useProjectStore.getState();
      expect(state.project?.statuses).toHaveLength(5);
      expect(state.project?.statuses[4].id).toBe("blocked");
      expect(state.project?.statuses[4].name).toBe("ブロック中");
    });

    it("追加後に入力欄がクリアされる", async () => {
      const user = userEvent.setup();
      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      const idInput = screen.getByPlaceholderText("ID（英数字）");
      await user.type(idInput, "blocked");

      const nameInput = screen.getByPlaceholderText("ステータス名");
      await user.type(nameInput, "ブロック中");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      expect(idInput).toHaveValue("");
      expect(nameInput).toHaveValue("");
    });
  });

  describe("ステータス編集", () => {
    it("ステータス名を編集できる", async () => {
      const user = userEvent.setup();

      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      // 編集ボタンをクリック
      const editButton = screen.getByTestId("edit-status-1");
      await user.click(editButton);

      // 名前を変更
      const nameInput = screen.getByDisplayValue("処理中");
      await user.clear(nameInput);
      await user.type(nameInput, "作業中");

      // 保存
      const saveButton = screen.getByTestId("save-status-1");
      await user.click(saveButton);

      const state = useProjectStore.getState();
      const status = state.project?.statuses.find(
        (s) => s.id === "in_progress"
      );
      expect(status?.name).toBe("作業中");
    });

    it("ステータスの色を変更できる", async () => {
      const user = userEvent.setup();

      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      // 編集ボタンをクリック
      const editButton = screen.getByTestId("edit-status-1");
      await user.click(editButton);

      // 色を変更（color inputはfireEventで直接値を変更）
      const colorInput = screen.getByTestId("color-input-1");
      fireEvent.input(colorInput, { target: { value: "#ff5733" } });

      // 保存
      const saveButton = screen.getByTestId("save-status-1");
      await user.click(saveButton);

      const state = useProjectStore.getState();
      const status = state.project?.statuses.find(
        (s) => s.id === "in_progress"
      );
      expect(status?.color.toLowerCase()).toBe("#ff5733");
    });
  });

  describe("ステータス削除", () => {
    it("ステータスを削除できる", async () => {
      const user = userEvent.setup();

      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      const deleteButton = screen.getByTestId("delete-status-2"); // レビュー待ちを削除
      await user.click(deleteButton);

      const state = useProjectStore.getState();
      expect(state.project?.statuses).toHaveLength(3);
      expect(
        state.project?.statuses.find((s) => s.id === "review")
      ).toBeUndefined();
    });

    it("最後の1つは削除できない", async () => {
      // 3つ削除して1つだけにする
      useProjectStore.getState().deleteStatus("in_progress");
      useProjectStore.getState().deleteStatus("review");
      useProjectStore.getState().deleteStatus("completed");

      render(
        <StatusCustomizationDialog open={true} onOpenChange={vi.fn()} />
      );

      // 削除ボタンが無効になっていることを確認
      const deleteButton = screen.getByTestId("delete-status-0");
      expect(deleteButton).toBeDisabled();
    });
  });

  describe("ダイアログを閉じる", () => {
    it("閉じるボタンでダイアログが閉じる", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <StatusCustomizationDialog open={true} onOpenChange={onOpenChange} />
      );

      const closeButton = screen.getByRole("button", { name: "閉じる" });
      await user.click(closeButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
