import { describe, it, expect } from "vitest";
import {
  getDateRange,
  calculateBarPosition,
  getDaysInRange,
  getWeeksInRange,
  getMonthsInRange,
  formatDateHeader,
  calculateDateFromDrag,
  getDragType,
} from "./ganttUtils";

describe("ganttUtils", () => {
  describe("getDateRange", () => {
    it("タスクがない場合、今日を含む2週間の範囲を返す", () => {
      const today = new Date();
      const result = getDateRange([]);

      // 開始日は今日から7日前
      expect(result.startDate.getDate()).toBe(
        new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).getDate()
      );
      // 終了日は今日から7日後
      expect(result.endDate.getDate()).toBe(
        new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).getDate()
      );
    });

    it("タスクの日程から範囲を計算する", () => {
      const tasks = [
        { id: "1", startDate: "2024-01-10", endDate: "2024-01-20" },
        { id: "2", startDate: "2024-01-05", endDate: "2024-01-15" },
        { id: "3", startDate: "2024-01-15", endDate: "2024-01-25" },
      ];

      const result = getDateRange(tasks);

      // 最も早い開始日の前にパディング
      expect(result.startDate.toISOString().slice(0, 10)).toBe("2024-01-01");
      // 最も遅い終了日の後にパディング
      expect(result.endDate.toISOString().slice(0, 10)).toBe("2024-01-29");
    });

    it("日付のないタスクは無視する", () => {
      const tasks = [
        { id: "1" },
        { id: "2", startDate: "2024-01-10", endDate: "2024-01-20" },
      ];

      const result = getDateRange(tasks);

      expect(result.startDate.toISOString().slice(0, 10)).toBe("2024-01-06");
      expect(result.endDate.toISOString().slice(0, 10)).toBe("2024-01-24");
    });
  });

  describe("calculateBarPosition", () => {
    it("日付範囲内でのバーの位置と幅を計算する", () => {
      const rangeStart = new Date("2024-01-01");
      const rangeEnd = new Date("2024-01-31");
      const taskStart = new Date("2024-01-10");
      const taskEnd = new Date("2024-01-20");
      const dayWidth = 40;

      const result = calculateBarPosition(
        taskStart,
        taskEnd,
        rangeStart,
        rangeEnd,
        dayWidth
      );

      expect(result).not.toBeNull();
      // 1月10日は1月1日から9日後 → left = 9 * 40 = 360
      expect(result!.left).toBe(360);
      // 1月10日〜20日は11日間 → width = 11 * 40 = 440
      expect(result!.width).toBe(440);
    });

    it("開始日のみの場合、1日分の幅を返す", () => {
      const rangeStart = new Date("2024-01-01");
      const rangeEnd = new Date("2024-01-31");
      const taskStart = new Date("2024-01-15");
      const dayWidth = 40;

      const result = calculateBarPosition(
        taskStart,
        undefined,
        rangeStart,
        rangeEnd,
        dayWidth
      );

      expect(result).not.toBeNull();
      expect(result!.left).toBe(560); // 14日 * 40
      expect(result!.width).toBe(40); // 1日分
    });

    it("日程がない場合、nullを返す", () => {
      const rangeStart = new Date("2024-01-01");
      const rangeEnd = new Date("2024-01-31");
      const dayWidth = 40;

      const result = calculateBarPosition(
        undefined,
        undefined,
        rangeStart,
        rangeEnd,
        dayWidth
      );

      expect(result).toBeNull();
    });
  });

  describe("getDaysInRange", () => {
    it("範囲内のすべての日付を返す", () => {
      const start = new Date(2024, 0, 1); // 2024-01-01 (ローカルタイム)
      const end = new Date(2024, 0, 5); // 2024-01-05

      const result = getDaysInRange(start, end);

      expect(result.length).toBe(5);
      expect(result[0].getFullYear()).toBe(2024);
      expect(result[0].getMonth()).toBe(0);
      expect(result[0].getDate()).toBe(1);
      expect(result[4].getDate()).toBe(5);
    });
  });

  describe("getWeeksInRange", () => {
    it("範囲内の週情報を返す", () => {
      const start = new Date("2024-01-01"); // 月曜日
      const end = new Date("2024-01-21"); // 日曜日

      const result = getWeeksInRange(start, end);

      expect(result.length).toBe(3);
      expect(result[0].weekNumber).toBe(1);
      expect(result[0].days).toBe(7);
    });
  });

  describe("getMonthsInRange", () => {
    it("範囲内の月情報を返す", () => {
      const start = new Date("2024-01-15");
      const end = new Date("2024-03-15");

      const result = getMonthsInRange(start, end);

      expect(result.length).toBe(3);
      expect(result[0].month).toBe(0); // January
      expect(result[1].month).toBe(1); // February
      expect(result[2].month).toBe(2); // March
    });
  });

  describe("formatDateHeader", () => {
    it("日表示の場合、日付のみ返す", () => {
      const date = new Date("2024-01-15");
      const result = formatDateHeader(date, "day");
      expect(result).toBe("15");
    });

    it("週表示の場合、週番号を返す", () => {
      const date = new Date("2024-01-15");
      const result = formatDateHeader(date, "week");
      expect(result).toMatch(/W\d+/);
    });

    it("月表示の場合、月名を返す", () => {
      const date = new Date("2024-01-15");
      const result = formatDateHeader(date, "month");
      expect(result).toBe("1月");
    });
  });

  describe("calculateDateFromDrag", () => {
    it("ピクセル差分から日付を計算する（右に移動）", () => {
      const originalDate = new Date("2024-01-10");
      const pixelDiff = 80; // 2日分
      const dayWidth = 40;

      const result = calculateDateFromDrag(originalDate, pixelDiff, dayWidth);

      expect(result.toISOString().slice(0, 10)).toBe("2024-01-12");
    });

    it("ピクセル差分から日付を計算する（左に移動）", () => {
      const originalDate = new Date("2024-01-10");
      const pixelDiff = -120; // 3日分戻る
      const dayWidth = 40;

      const result = calculateDateFromDrag(originalDate, pixelDiff, dayWidth);

      expect(result.toISOString().slice(0, 10)).toBe("2024-01-07");
    });

    it("1日未満のピクセル差分は丸められる", () => {
      const originalDate = new Date("2024-01-10");
      const pixelDiff = 19; // 0.475日分 → 0日
      const dayWidth = 40;

      const result = calculateDateFromDrag(originalDate, pixelDiff, dayWidth);

      expect(result.toISOString().slice(0, 10)).toBe("2024-01-10");
    });

    it("0.5日以上は1日として丸められる", () => {
      const originalDate = new Date("2024-01-10");
      const pixelDiff = 25; // 0.625日分 → 1日
      const dayWidth = 40;

      const result = calculateDateFromDrag(originalDate, pixelDiff, dayWidth);

      expect(result.toISOString().slice(0, 10)).toBe("2024-01-11");
    });
  });

  describe("getDragType", () => {
    it("バー左端10%以内は左リサイズ", () => {
      const x = 5;
      const barLeft = 0;
      const barWidth = 100;

      const result = getDragType(x, barLeft, barWidth);

      expect(result).toBe("resize-start");
    });

    it("バー右端10%以内は右リサイズ", () => {
      const x = 95;
      const barLeft = 0;
      const barWidth = 100;

      const result = getDragType(x, barLeft, barWidth);

      expect(result).toBe("resize-end");
    });

    it("バー中央は移動", () => {
      const x = 50;
      const barLeft = 0;
      const barWidth = 100;

      const result = getDragType(x, barLeft, barWidth);

      expect(result).toBe("move");
    });

    it("バーの外は判定なし", () => {
      const x = -10;
      const barLeft = 0;
      const barWidth = 100;

      const result = getDragType(x, barLeft, barWidth);

      expect(result).toBeNull();
    });

    it("狭いバー（40px以下）では左右10px以内がリサイズ", () => {
      const barLeft = 0;
      const barWidth = 40;

      // 左端8px → resize-start
      expect(getDragType(8, barLeft, barWidth)).toBe("resize-start");
      // 右端（32px〜40px）→ resize-end
      expect(getDragType(35, barLeft, barWidth)).toBe("resize-end");
      // 中央（10px〜30px）→ move
      expect(getDragType(20, barLeft, barWidth)).toBe("move");
    });
  });
});
