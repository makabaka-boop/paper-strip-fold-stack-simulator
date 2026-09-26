import { describe, it, expect } from 'vitest';
import { Workbench } from '../src/lib/workbench.svelte';
import { MAX_OPS } from '../src/lib/fold';

describe('工作台：预览 / 确认 / 撤销 / 重做', () => {
  it('草稿合法时给出预览，确认后推进游标', () => {
    const wb = new Workbench();
    wb.draft = { crease: 4, side: 'right' };
    expect(wb.draftError).toBeNull();
    expect(wb.preview).not.toBeNull();
    expect(wb.preview!.columns).toHaveLength(4);

    expect(wb.confirm()).toBe(true);
    expect(wb.opsUsed).toBe(1);
    expect(wb.columnCount).toBe(4);
    expect(wb.records[0]).toMatchObject({ step: 1, crease: 4, side: 'right', columnsBefore: 8, columnsAfter: 4 });
  });

  it('无效折痕确认失败且不改变状态', () => {
    const wb = new Workbench();
    wb.draft = { crease: 7, side: 'left' }; // 左 7 列 > 右 1 列
    expect(wb.draftError).toBe('MOVING_SIDE_TOO_WIDE');
    expect(wb.preview).toBeNull();
    expect(wb.confirm()).toBe(false);
    expect(wb.opsUsed).toBe(0);
    expect(wb.columnCount).toBe(8);
  });

  it('撤销 / 重做沿快照栈移动', () => {
    const wb = new Workbench();
    wb.draft = { crease: 4, side: 'right' };
    wb.confirm();
    wb.draft = { crease: 2, side: 'left' };
    wb.confirm();
    expect(wb.columnCount).toBe(2);

    wb.undo();
    expect(wb.columnCount).toBe(4);
    wb.undo();
    expect(wb.columnCount).toBe(8);
    expect(wb.canUndo).toBe(false);

    wb.redo();
    wb.redo();
    expect(wb.columnCount).toBe(2);
    expect(wb.canRedo).toBe(false);
  });

  it('撤销后录入新操作会截断重做分支', () => {
    const wb = new Workbench();
    wb.draft = { crease: 4, side: 'right' };
    wb.confirm();
    wb.draft = { crease: 2, side: 'left' };
    wb.confirm();
    wb.undo();
    wb.draft = { crease: 1, side: 'left' };
    expect(wb.confirm()).toBe(true);
    expect(wb.canRedo).toBe(false);
    expect(wb.opsUsed).toBe(2);
    expect(wb.records).toHaveLength(2);
    expect(wb.records[1]).toMatchObject({ crease: 1, side: 'left' });
  });

  it(`最多录入 ${MAX_OPS} 次操作`, () => {
    const wb = new Workbench();
    wb.reset(32);
    for (let i = 0; i < MAX_OPS; i++) {
      wb.draft = { crease: 1, side: 'left' };
      expect(wb.confirm()).toBe(true);
    }
    expect(wb.opsUsed).toBe(MAX_OPS);
    expect(wb.draftError).toBe('OP_LIMIT');
    expect(wb.confirm()).toBe(false);
    expect(wb.opsUsed).toBe(MAX_OPS);
  });

  it('导出 JSON 与当前剖面共用状态，且只含已生效历史', () => {
    const wb = new Workbench();
    wb.draft = { crease: 4, side: 'right' };
    wb.confirm();
    wb.draft = { crease: 2, side: 'left' };
    wb.confirm();
    wb.undo(); // 回退到只生效第 1 步

    const payload = wb.exportPayload;
    expect(payload.initialUnits).toBe(8);
    expect(payload.currentColumns).toBe(4);
    expect(payload.history).toHaveLength(1);
    expect(payload.columns[0]!.layers).toEqual([
      { id: 1, face: 'up' },
      { id: 8, face: 'down' },
    ]);
  });

  it('重置清空全部历史', () => {
    const wb = new Workbench();
    wb.draft = { crease: 4, side: 'right' };
    wb.confirm();
    wb.reset(16);
    expect(wb.opsUsed).toBe(0);
    expect(wb.columnCount).toBe(16);
    expect(wb.records).toHaveLength(0);
    expect(wb.canUndo).toBe(false);
  });
});
