/**
 * 工作台状态：快照栈 + 游标实现撤销/重做，
 * 预览、确认、撤销、重做与导出 JSON 全部共用此仓库。
 */
import {
  applyFold,
  initialStrip,
  validateFold,
  MAX_OPS,
  type FoldError,
  type FoldOp,
  type StripState,
} from './fold';
import { buildExport, type ExportPayload, type FoldRecord } from './export';

export type DraftError = FoldError | 'OP_LIMIT';

export const DRAFT_ERROR_TEXT: Record<DraftError, string> = {
  CREASE_OUT_OF_RANGE: '折痕位置无效：必须位于当前相邻两列之间',
  MOVING_SIDE_TOO_WIDE: '移动侧宽度超过静止侧，无法折叠',
  OP_LIMIT: `最多录入 ${MAX_OPS} 次操作`,
};

export class Workbench {
  units = $state(8);
  /** 状态快照栈，snapshots[0] 为初始纸带 */
  snapshots = $state<StripState[]>([initialStrip(8)]);
  /** 每一步对应的折叠记录，records[i] 由 snapshots[i] 得到 snapshots[i+1] */
  records = $state<FoldRecord[]>([]);
  /** 当前游标：已生效操作数 */
  cursor = $state(0);
  /** 待确认的折叠草稿 */
  draft = $state<FoldOp>({ crease: 1, side: 'left' });

  current: StripState = $derived(this.snapshots[this.cursor]);
  columnCount: number = $derived(this.current.columns.length);
  canUndo: boolean = $derived(this.cursor > 0);
  canRedo: boolean = $derived(this.cursor < this.snapshots.length - 1);
  opsUsed: number = $derived(this.cursor);

  draftError: DraftError | null = $derived(
    this.cursor >= MAX_OPS ? 'OP_LIMIT' : validateFold(this.current, this.draft),
  );
  /** 预览剖面：草稿合法时的折叠结果，否则为 null */
  preview: StripState | null = $derived(
    this.draftError === null ? applyFold(this.current, this.draft) : null,
  );
  /** 导出内容，与当前剖面共用状态 */
  exportPayload: ExportPayload = $derived(
    buildExport(this.units, this.current, this.records.slice(0, this.cursor)),
  );

  /** 确认录入当前草稿；无效折痕不改变状态。 */
  confirm(): boolean {
    if (this.preview === null) return false;
    const before = this.columnCount;
    this.snapshots = [...this.snapshots.slice(0, this.cursor + 1), this.preview];
    this.records = [
      ...this.records.slice(0, this.cursor),
      {
        step: this.cursor + 1,
        crease: this.draft.crease,
        side: this.draft.side,
        columnsBefore: before,
        columnsAfter: this.preview.columns.length,
      },
    ];
    this.cursor += 1;
    return true;
  }

  undo(): void {
    if (this.canUndo) this.cursor -= 1;
  }

  redo(): void {
    if (this.canRedo) this.cursor += 1;
  }

  /** 重置纸带长度并清空全部历史。 */
  reset(units: number): void {
    this.units = units;
    this.snapshots = [initialStrip(units)];
    this.records = [];
    this.cursor = 0;
    this.draft = { crease: 1, side: 'left' };
  }
}

export const workbench = new Workbench();
