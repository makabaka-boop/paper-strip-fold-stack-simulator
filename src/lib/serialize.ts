import type { FoldState } from './types';
import { sideLabel } from './fold';

export interface ExportColumn {
  column: number;
  /** 自下而上 */
  bottomToTop: Array<{
    cell: number;
    face: 'front' | 'back';
    foldHistory: Array<{ index: number; crease: number; moving: 'left' | 'right' }>;
  }>;
}

export interface ExportJson {
  initialCells: number;
  columnCount: number;
  operations: Array<{ step: number; crease: number; action: string; side: 'left' | 'right' }>;
  columns: ExportColumn[];
  exportedAt: string;
}

/**
 * 导出 JSON。导出数据与界面层叠剖面读取同一个 FoldState，
 * 保证“导出 JSON 与剖面共用状态”，不会出现视图与导出不一致。
 */
export function exportState(state: FoldState, exportedAt: Date = new Date()): ExportJson {
  return {
    initialCells: state.initialCells,
    columnCount: state.columns.length,
    operations: state.past.map((op, i) => ({
      step: i + 1,
      crease: op.crease,
      side: op.side,
      action: `${sideLabel(op.side)}@折痕${op.crease}`
    })),
    columns: state.columns.map((stack, i) => ({
      column: i + 1,
      bottomToTop: stack.layers.map((layer) => ({
        cell: layer.id,
        face: layer.face,
        foldHistory: layer.history.map((h) => ({
          index: h.index,
          crease: h.crease,
          moving: h.moving
        }))
      }))
    })),
    exportedAt: exportedAt.toISOString()
  };
}
