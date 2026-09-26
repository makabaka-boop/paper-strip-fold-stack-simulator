/**
 * 折纸带核心模型。
 *
 * 纸带由若干「列」组成，每列是一叠自下而上的单位格。
 * 折叠时，移动侧整叠绕折痕镜像盖到静止侧上方：
 *   - 列顺序关于折痕镜像；
 *   - 每个移动列内部的层叠顺序整体反转；
 *   - 每个单位格的正反面交换。
 */

export interface Cell {
  /** 原始格编号（1 起，从左到右） */
  id: number;
  /** 当前是否正面朝上 */
  faceUp: boolean;
}

export type Side = 'left' | 'right';

export interface FoldOp {
  /** 折痕位置：1 起，位于第 crease-1 列与第 crease 列之间 */
  crease: number;
  /** 翻起哪一侧 */
  side: Side;
}

export interface StripState {
  /** 每列为一叠，数组下标 0 为最底层 */
  columns: Cell[][];
}

export const MIN_UNITS = 2;
export const MAX_UNITS = 32;
export const MAX_OPS = 10;

export function initialStrip(units: number): StripState {
  if (!Number.isInteger(units) || units < MIN_UNITS || units > MAX_UNITS) {
    throw new RangeError(`初始格数必须是 [${MIN_UNITS}, ${MAX_UNITS}] 内的整数，收到 ${units}`);
  }
  return {
    columns: Array.from({ length: units }, (_, i) => [{ id: i + 1, faceUp: true }]),
  };
}

export type FoldError = 'CREASE_OUT_OF_RANGE' | 'MOVING_SIDE_TOO_WIDE';

export const FOLD_ERROR_TEXT: Record<FoldError, string> = {
  CREASE_OUT_OF_RANGE: '折痕位置无效：必须位于当前相邻两列之间',
  MOVING_SIDE_TOO_WIDE: '移动侧宽度超过静止侧，无法折叠',
};

/** 校验一次折叠；返回 null 表示合法。 */
export function validateFold(state: StripState, op: FoldOp): FoldError | null {
  const n = state.columns.length;
  if (!Number.isInteger(op.crease) || op.crease < 1 || op.crease > n - 1) {
    return 'CREASE_OUT_OF_RANGE';
  }
  const moving = op.side === 'left' ? op.crease : n - op.crease;
  const stationary = n - moving;
  if (moving > stationary) return 'MOVING_SIDE_TOO_WIDE';
  return null;
}

/** 反转一叠：层序颠倒且每格翻面。 */
function flipStack(stack: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (let i = stack.length - 1; i >= 0; i--) {
    out.push({ id: stack[i].id, faceUp: !stack[i].faceUp });
  }
  return out;
}

/**
 * 应用一次折叠。无效折痕返回 null，不改变任何状态。
 * 镜像公式：列 i 绕折痕 crease 落到目标列 2*crease-1-i。
 */
export function applyFold(state: StripState, op: FoldOp): StripState | null {
  if (validateFold(state, op) !== null) return null;
  const n = state.columns.length;
  const c = op.crease;
  const next: Cell[][] = state.columns.map((s) => s.slice());

  if (op.side === 'left') {
    for (let i = 0; i < c; i++) {
      const target = 2 * c - 1 - i;
      next[target] = [...next[target], ...flipStack(state.columns[i])];
    }
    next.splice(0, c);
  } else {
    for (let i = c; i < n; i++) {
      const target = 2 * c - 1 - i;
      next[target] = [...next[target], ...flipStack(state.columns[i])];
    }
    next.splice(c);
  }
  return { columns: next };
}

/** 统计当前总格数（用于守恒检查）。 */
export function countCells(state: StripState): number {
  return state.columns.reduce((sum, col) => sum + col.length, 0);
}
