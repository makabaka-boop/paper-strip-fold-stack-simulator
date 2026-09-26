import type {
  FoldOp,
  FoldPreview,
  FoldRecord,
  FoldSide,
  FoldState,
  InvalidReason,
  Layer,
  Side,
  Stack
} from './types';

export const MIN_CELLS = 2;
export const MAX_CELLS = 32;

/** 初始状态：n 个从左到右编号的单位格，各自占一列，全部正面朝上 */
export function createInitialState(n: number): FoldState {
  const columns: Stack[] = [];
  for (let i = 1; i <= n; i++) {
    columns.push({ layers: [{ id: i, face: 'front', history: [] }] });
  }
  return { initialCells: n, columns, past: [] };
}

/**
 * 校验一次折叠。
 * - 折痕必须在当前列之间：1 <= crease < 列数；
 * - 翻起左侧时左侧宽 crease，静止侧宽 列数-crease；
 * - 翻起右侧时右侧宽 列数-crease，静止侧宽 crease；
 * - 移动侧宽度不得超过静止侧（相等允许：整叠对折，两侧互为镜像后重合）。
 */
export function validateFold(state: FoldState, op: FoldOp): InvalidReason | null {
  const total = state.columns.length;
  if (!Number.isInteger(op.crease) || op.crease < 1 || op.crease >= total) {
    return 'crease-out-of-range';
  }
  const leftWidth = op.crease;
  const rightWidth = total - op.crease;
  const movingWidth = op.side === 'left' ? leftWidth : rightWidth;
  const stillWidth = op.side === 'left' ? rightWidth : leftWidth;
  if (movingWidth > stillWidth) return 'moving-side-too-wide';
  return null;
}

function otherFace(face: Side): Side {
  return face === 'front' ? 'back' : 'front';
}

/**
 * 翻转一整侧的某一列：
 * 1. 自下而上的层序反转（镜像后原来贴台面的层到最上面）；
 * 2. 每层正反面交换；
 * 3. 给每层追加本次折叠历史。
 */
function flipStack(stack: Stack, record: FoldRecord): Stack {
  const layers: Layer[] = [];
  for (let i = stack.layers.length - 1; i >= 0; i--) {
    const layer = stack.layers[i];
    layers.push({
      id: layer.id,
      face: otherFace(layer.face),
      history: [...layer.history, record]
    });
  }
  return { layers };
}

/**
 * 计算一次折叠的预览结果。无效折痕不改变状态（ok=false 且返回原状态）。
 */
export function previewFold(state: FoldState, op: FoldOp): FoldPreview {
  const reason = validateFold(state, op);
  if (reason) {
    return { ok: false, reason, op, state };
  }

  const total = state.columns.length;
  const c = op.crease;
  const record: FoldRecord = { index: state.past.length + 1, crease: c, moving: op.side };
  const columns: Stack[] = [];

  if (op.side === 'left') {
    // 静止侧是右侧 c..total-1（0-based），折后仍在原位，成为新第 1.. 列。
    // 移动列 i（0..c-1）镜像后落到新列 (c-1-i)，翻转折盖在静止列上方。
    for (let j = 0; j < total - c; j++) {
      const stationary = state.columns[c + j];
      const movingIndex = c - 1 - j;
      const moving = movingIndex >= 0 ? flipStack(state.columns[movingIndex], record) : { layers: [] };
      columns.push({ layers: [...stationary.layers, ...moving.layers] });
    }
  } else {
    // 静止侧是左侧 0..c-1（0-based），列号不变。
    // 移动列 (c+j) 镜像后落到新列 (c-1-j)，翻转后盖到静止列上方。
    for (let i = 0; i < c; i++) {
      const stationary = state.columns[i];
      const movingIndex = 2 * c - 1 - i;
      const moving =
        movingIndex < total ? flipStack(state.columns[movingIndex], record) : { layers: [] };
      columns.push({ layers: [...stationary.layers, ...moving.layers] });
    }
  }

  return {
    ok: true,
    op,
    state: {
      initialCells: state.initialCells,
      columns,
      past: [...state.past, op]
    }
  };
}

/** 应用折叠（便捷封装）；无效时返回原状态 */
export function applyFold(state: FoldState, op: FoldOp): FoldState {
  return previewFold(state, op).state;
}

export function movingWidthOf(op: FoldOp, totalColumns: number): number {
  return op.side === 'left' ? op.crease : totalColumns - op.crease;
}

export function sideLabel(side: FoldSide): string {
  return side === 'left' ? '翻左侧' : '翻右侧';
}
