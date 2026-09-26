/** 导出 JSON 的构造，与剖面图共用同一份状态。 */
import type { FoldOp, StripState } from './fold';

export interface FoldRecord extends FoldOp {
  /** 第几次操作（1 起） */
  step: number;
  columnsBefore: number;
  columnsAfter: number;
}

export interface ExportPayload {
  initialUnits: number;
  currentColumns: number;
  /** 每个当前列，自下而上的层 */
  columns: Array<{
    position: number;
    layers: Array<{ id: number; face: 'up' | 'down' }>;
  }>;
  /** 已生效的折叠历史 */
  history: FoldRecord[];
}

export function buildExport(
  initialUnits: number,
  state: StripState,
  history: FoldRecord[],
): ExportPayload {
  return {
    initialUnits,
    currentColumns: state.columns.length,
    columns: state.columns.map((stack, i) => ({
      position: i + 1,
      layers: stack.map((c) => ({ id: c.id, face: c.faceUp ? ('up' as const) : ('down' as const) })),
    })),
    history,
  };
}
