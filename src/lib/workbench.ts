import {
  MAX_CELLS,
  MIN_CELLS,
  applyFold,
  createInitialState,
  previewFold,
  validateFold
} from './fold';
import type { ExportJson } from './serialize';
import { exportState } from './serialize';
import type { FoldOp, FoldState, InvalidReason } from './types';

export const OP_LIMIT = 10;

/**
 * 工作台状态机（纯 TS，不依赖 Svelte）。
 * Svelte 组件用 $state 包装实例后即可深度响应。
 *
 * 交互流：录入操作 -> preview 只算预览不改变已确认状态
 * -> confirm 提交（或重新录入）-> undo / redo 线性回放。
 */
export class Workbench {
  private initial = 6;
  private state: FoldState = createInitialState(this.initial);
  private future: FoldOp[] = [];
  private draft: FoldOp = { crease: 1, side: 'left' };
  private lastInvalid: InvalidReason | null = null;

  get initialCells(): number {
    return this.initial;
  }
  get current(): FoldState {
    return this.state;
  }
  get past(): FoldOp[] {
    return this.state.past;
  }
  get redoStack(): FoldOp[] {
    return this.future;
  }
  get opLimit(): number {
    return OP_LIMIT;
  }
  get draftOp(): FoldOp {
    return this.draft;
  }
  get invalidReason(): InvalidReason | null {
    return this.lastInvalid;
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  get limitReached(): boolean {
    return this.past.length >= OP_LIMIT;
  }

  setInitialCells(n: number): void {
    const clamped = Math.max(MIN_CELLS, Math.min(MAX_CELLS, Math.round(n)));
    this.initial = clamped;
    this.reset();
  }

  setDraftCrease(crease: number): void {
    this.draft = { ...this.draft, crease };
  }

  setDraftSide(side: FoldOp['side']): void {
    this.draft = { ...this.draft, side };
  }

  /** 基于当前已确认状态计算预览（不落库） */
  preview(): FoldState {
    return previewFold(this.state, this.draft).state;
  }

  previewValid(): boolean {
    return validateFold(this.state, this.draft) === null && !this.limitReached;
  }

  /**
   * 确认当前录入的操作。
   * - 已达 10 次上限 / 折痕越界 / 移动侧过宽：状态不变，记录无效原因；
   * - 成功后清空 redo 栈（在历史分支上继续，旧的未来失效）。
   */
  confirmDraft(): boolean {
    if (this.limitReached) {
      this.lastInvalid = 'crease-out-of-range';
      return false;
    }
    const reason = validateFold(this.state, this.draft);
    if (reason) {
      this.lastInvalid = reason;
      return false;
    }
    this.state = applyFold(this.state, this.draft);
    this.future = [];
    this.lastInvalid = null;
    // 把录入框顺到一个大概率合法的位置，方便连续操作
    this.draft = { crease: 1, side: this.draft.side };
    return true;
  }

  /** 撤销：从初始状态重放到倒数第二步 */
  undo(): FoldOp | null {
    if (this.past.length === 0) return null;
    const op = this.past[this.past.length - 1];
    const ops = this.past.slice(0, -1);
    this.state = replay(this.initial, ops);
    this.future = [op, ...this.future];
    this.lastInvalid = null;
    return op;
  }

  /** 重做：应用 redo 栈顶操作 */
  redo(): FoldOp | null {
    const op = this.future[0];
    if (!op) return null;
    this.state = applyFold(this.state, op);
    this.future = this.future.slice(1);
    this.lastInvalid = null;
    return op;
  }

  reset(): void {
    this.state = createInitialState(this.initial);
    this.future = [];
    this.draft = { crease: 1, side: 'left' };
    this.lastInvalid = null;
  }

  /** 与剖面共用 current 状态导出 */
  toJson(): ExportJson {
    return exportState(this.state);
  }
}

/** 从初始状态按操作序列线性折叠（无效操作跳过），供撤销重放 */
function replay(initialCells: number, ops: FoldOp[]): FoldState {
  let state = createInitialState(initialCells);
  for (const op of ops) {
    if (validateFold(state, op) === null) state = applyFold(state, op);
  }
  return state;
}
