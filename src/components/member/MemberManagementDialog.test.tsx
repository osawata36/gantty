import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberManagementDialog } from "./MemberManagementDialog";
import { useProjectStore } from "@/stores/projectStore";

describe("MemberManagementDialog", () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
    useProjectStore.getState().createNewProject("テストプロジェクト");
  });

  describe("ダイアログの表示", () => {
    it("openがtrueの時にダイアログが表示される", () => {
      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText("メンバー管理")).toBeInTheDocument();
    });

    it("openがfalseの時にダイアログが表示されない", () => {
      render(
        <MemberManagementDialog open={false} onOpenChange={vi.fn()} />
      );

      expect(screen.queryByText("メンバー管理")).not.toBeInTheDocument();
    });
  });

  describe("メンバー追加", () => {
    it("名前を入力して追加ボタンをクリックするとメンバーが追加される", async () => {
      const user = userEvent.setup();
      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText("メンバー名を入力");
      await user.type(input, "田中太郎");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      const state = useProjectStore.getState();
      expect(state.project?.resources).toHaveLength(1);
      expect(state.project?.resources[0].name).toBe("田中太郎");
    });

    it("追加後に入力欄がクリアされる", async () => {
      const user = userEvent.setup();
      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      const input = screen.getByPlaceholderText("メンバー名を入力");
      await user.type(input, "田中太郎");

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      expect(input).toHaveValue("");
    });

    it("空の名前では追加できない", async () => {
      const user = userEvent.setup();
      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      const addButton = screen.getByRole("button", { name: "追加" });
      await user.click(addButton);

      const state = useProjectStore.getState();
      expect(state.project?.resources).toHaveLength(0);
    });
  });

  describe("メンバー一覧表示", () => {
    it("登録済みのメンバーが一覧に表示される", () => {
      useProjectStore.getState().addResource("田中太郎");
      useProjectStore.getState().addResource("山田花子");

      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText("田中太郎")).toBeInTheDocument();
      expect(screen.getByText("山田花子")).toBeInTheDocument();
    });

    it("メンバーがいない場合はメッセージを表示", () => {
      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText("メンバーがいません")).toBeInTheDocument();
    });
  });

  describe("メンバー編集", () => {
    it("メンバー名を編集できる", async () => {
      useProjectStore.getState().addResource("田中太郎");
      const user = userEvent.setup();

      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      // 編集ボタンをクリック
      const editButton = screen.getByTestId("edit-member-0");
      await user.click(editButton);

      // 名前を変更
      const nameInput = screen.getByDisplayValue("田中太郎");
      await user.clear(nameInput);
      await user.type(nameInput, "田中次郎");

      // 保存
      const saveButton = screen.getByTestId("save-member-0");
      await user.click(saveButton);

      const state = useProjectStore.getState();
      expect(state.project?.resources[0].name).toBe("田中次郎");
    });

    it("メンバーの色を変更できる", async () => {
      useProjectStore.getState().addResource("田中太郎");
      const user = userEvent.setup();

      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      // 編集ボタンをクリック
      const editButton = screen.getByTestId("edit-member-0");
      await user.click(editButton);

      // 色を変更（color inputはfireEventで直接値を変更）
      const colorInput = screen.getByTestId("color-input-0");
      fireEvent.input(colorInput, { target: { value: "#FF5733" } });

      // 保存
      const saveButton = screen.getByTestId("save-member-0");
      await user.click(saveButton);

      const state = useProjectStore.getState();
      expect(state.project?.resources[0].color.toLowerCase()).toBe("#ff5733");
    });
  });

  describe("メンバー削除", () => {
    it("メンバーを削除できる", async () => {
      useProjectStore.getState().addResource("田中太郎");
      const user = userEvent.setup();

      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      const deleteButton = screen.getByTestId("delete-member-0");
      await user.click(deleteButton);

      const state = useProjectStore.getState();
      expect(state.project?.resources).toHaveLength(0);
    });

    it("メンバーを削除するとタスクから割り当てがクリアされる", async () => {
      useProjectStore.getState().addResource("田中太郎");
      useProjectStore.getState().addTask("タスク1");

      const resourceId =
        useProjectStore.getState().project?.resources[0].id!;
      const taskId = useProjectStore.getState().project?.tasks[0].id!;
      useProjectStore.getState().updateTask(taskId, {
        responsibleId: resourceId,
        ballHolderId: resourceId,
      });

      const user = userEvent.setup();
      render(
        <MemberManagementDialog open={true} onOpenChange={vi.fn()} />
      );

      const deleteButton = screen.getByTestId("delete-member-0");
      await user.click(deleteButton);

      const state = useProjectStore.getState();
      expect(state.project?.tasks[0].responsibleId).toBeUndefined();
      expect(state.project?.tasks[0].ballHolderId).toBeUndefined();
    });
  });

  describe("ダイアログを閉じる", () => {
    it("閉じるボタンでダイアログが閉じる", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MemberManagementDialog open={true} onOpenChange={onOpenChange} />
      );

      const closeButton = screen.getByRole("button", { name: "閉じる" });
      await user.click(closeButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
