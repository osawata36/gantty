import {
  addDays,
  subDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  eachDayOfInterval,
  getWeek,
  getMonth,
  getQuarter,
  format,
} from "date-fns";
import { ja } from "date-fns/locale";

export type ScaleType = "day" | "week" | "month" | "quarter";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface TaskWithDates {
  id: string;
  startDate?: string;
  endDate?: string;
}

interface BarPosition {
  left: number;
  width: number;
}

interface WeekInfo {
  weekNumber: number;
  year: number;
  startDate: Date;
  days: number;
}

interface MonthInfo {
  month: number;
  year: number;
  startDate: Date;
  days: number;
}

interface QuarterInfo {
  quarter: number; // 1-4
  year: number;
  startDate: Date;
  days: number;
}

/**
 * タスクの日程からガントチャートの表示範囲を計算する
 */
export function getDateRange(tasks: TaskWithDates[]): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 日付のあるタスクをフィルタリング
  const tasksWithDates = tasks.filter((t) => t.startDate || t.endDate);

  if (tasksWithDates.length === 0) {
    // タスクがない場合、今日を中心に2週間
    return {
      startDate: subDays(today, 7),
      endDate: addDays(today, 7),
    };
  }

  // 最も早い開始日と最も遅い終了日を取得
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const task of tasksWithDates) {
    if (task.startDate) {
      const start = new Date(task.startDate);
      if (!minDate || start < minDate) {
        minDate = start;
      }
    }
    if (task.endDate) {
      const end = new Date(task.endDate);
      if (!maxDate || end > maxDate) {
        maxDate = end;
      }
    }
  }

  // 開始日のみの場合
  if (minDate && !maxDate) {
    maxDate = addDays(minDate, 14);
  }
  // 終了日のみの場合
  if (!minDate && maxDate) {
    minDate = subDays(maxDate, 14);
  }

  // パディングを追加（前後4日）
  const paddingDays = 4;
  return {
    startDate: subDays(minDate!, paddingDays),
    endDate: addDays(maxDate!, paddingDays),
  };
}

/**
 * タスクバーの位置と幅を計算する
 */
export function calculateBarPosition(
  taskStart: Date | undefined,
  taskEnd: Date | undefined,
  rangeStart: Date,
  _rangeEnd: Date,
  dayWidth: number
): BarPosition | null {
  if (!taskStart) {
    return null;
  }

  const startDiff = differenceInDays(taskStart, rangeStart);
  const left = startDiff * dayWidth;

  let width: number;
  if (taskEnd) {
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    width = duration * dayWidth;
  } else {
    width = dayWidth; // 1日分
  }

  return { left, width };
}

/**
 * 範囲内のすべての日付を取得
 */
export function getDaysInRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end });
}

/**
 * 範囲内の週情報を取得
 */
export function getWeeksInRange(start: Date, end: Date): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  let current = startOfWeek(start, { weekStartsOn: 1 }); // 月曜始まり

  while (current <= end) {
    const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
    const actualEnd = weekEnd > end ? end : weekEnd;
    const actualStart = current < start ? start : current;

    weeks.push({
      weekNumber: getWeek(current, { weekStartsOn: 1 }),
      year: current.getFullYear(),
      startDate: actualStart,
      days: differenceInDays(actualEnd, actualStart) + 1,
    });

    current = addDays(weekEnd, 1);
  }

  return weeks;
}

/**
 * 範囲内の月情報を取得
 */
export function getMonthsInRange(start: Date, end: Date): MonthInfo[] {
  const months: MonthInfo[] = [];
  let current = startOfMonth(start);

  while (current <= end) {
    const monthEnd = endOfMonth(current);
    const actualEnd = monthEnd > end ? end : monthEnd;
    const actualStart = current < start ? start : current;

    months.push({
      month: getMonth(current),
      year: current.getFullYear(),
      startDate: actualStart,
      days: differenceInDays(actualEnd, actualStart) + 1,
    });

    current = addDays(monthEnd, 1);
  }

  return months;
}

/**
 * 範囲内の四半期情報を取得
 */
export function getQuartersInRange(start: Date, end: Date): QuarterInfo[] {
  const quarters: QuarterInfo[] = [];
  let current = startOfQuarter(start);

  while (current <= end) {
    const quarterEnd = endOfQuarter(current);
    const actualEnd = quarterEnd > end ? end : quarterEnd;
    const actualStart = current < start ? start : current;

    quarters.push({
      quarter: getQuarter(current),
      year: current.getFullYear(),
      startDate: actualStart,
      days: differenceInDays(actualEnd, actualStart) + 1,
    });

    current = addDays(quarterEnd, 1);
  }

  return quarters;
}

/**
 * 日付ヘッダーのフォーマット
 */
export function formatDateHeader(date: Date, scale: ScaleType): string {
  switch (scale) {
    case "day":
      return format(date, "d");
    case "week":
      return `W${getWeek(date, { weekStartsOn: 1 })}`;
    case "month":
      return format(date, "M月", { locale: ja });
    case "quarter":
      return `Q${getQuarter(date)}`;
  }
}

/**
 * ドラッグのタイプ
 */
export type DragType = "move" | "resize-start" | "resize-end";

/**
 * ドラッグ時のピクセル差分から新しい日付を計算する
 */
export function calculateDateFromDrag(
  originalDate: Date,
  pixelDiff: number,
  dayWidth: number
): Date {
  const daysDiff = Math.round(pixelDiff / dayWidth);
  return addDays(originalDate, daysDiff);
}

/**
 * マウス位置からドラッグタイプを判定する
 * @param x クリック位置のX座標（バー左端からの相対座標）
 * @param barLeft バーの左端座標
 * @param barWidth バーの幅
 * @returns ドラッグタイプ（move, resize-start, resize-end）またはnull（バー外）
 */
export function getDragType(
  x: number,
  barLeft: number,
  barWidth: number
): DragType | null {
  const relativeX = x - barLeft;

  // バーの外
  if (relativeX < 0 || relativeX > barWidth) {
    return null;
  }

  // 狭いバー（40px以下）では固定10pxをリサイズゾーンとする
  // 通常は10%をリサイズゾーンとする
  const resizeZone = barWidth <= 40 ? 10 : barWidth * 0.1;

  if (relativeX <= resizeZone) {
    return "resize-start";
  }

  if (relativeX >= barWidth - resizeZone) {
    return "resize-end";
  }

  return "move";
}
