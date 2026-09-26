import { describe, expect, it } from 'vitest';
import { Workbench } from '../src/lib/workbench';

describe('Workbench 状态机', () => {
  it('初始 6 格、上限 10 次、无撤销重做', () => {
    const wb = new Workbench();
    expect(wb.initialCells).toBe(6);
    expect(wb.current.columns).toHaveLength(6);
    expect(wb.canUndo).toBe(false);
    expect(wb.canRedo).toBe(false);
    expect(wb.opLimit).toBe(10);
    expect(wb.limitReached).toBe(false);
  });

  it('设置初始格数会夹到 2～32 并重置', () => {
    const wb = new Workbench();
    wb.setInitialCells(50);
    expect(wb.initialCells).toBe(32);
    expect(wb.current.columns).toHaveLength(32);
    wb.setInitialCells(1);
    expect(wb.initialCells).toBe(2);
  });

  it('预览不改变已确认状态，确认后才落库', () => {
    const wb = new Workbench();
    wb.setInitialCells(4);
    wb.setDraftSide('left');
    wb.setDraftCrease(2);
    const preview = wb.preview();
    expect(preview.columns).toHaveLength(2);
    expect(wb.current.columns).toHaveLength(4); // 尚未确认
    expect(wb.confirmDraft()).toBe(true);
    expect(wb.current.columns).toHaveLength(2);
    expect(wb.past).toHaveLength(1);
  });

  it('无效操作确认后状态与操作数都不变，并给出原因', () => {
    const wb = new Workbench();
    wb.setInitialCells(4);
    wb.setDraftSide('left');
    wb.setDraftCrease(3); // 3 > 1，移动侧过宽
    expect(wb.previewValid()).toBe(false);
    expect(wb.confirmDraft()).toBe(false);
    expect(wb.invalidReason).toBe('moving-side-too-wide');
    expect(wb.current.columns).toHaveLength(4);
    expect(wb.past).toHaveLength(0);

    wb.setDraftCrease(4); // 越界
    expect(wb.confirmDraft()).toBe(false);
    expect(wb.invalidReason).toBe('crease-out-of-range');
    expect(wb.past).toHaveLength(0);
  });

  it('撤销/重做可往返，状态一致；新确认清空 redo 栈', () => {
    const wb = new Workbench();
    wb.setInitialCells(4);
    wb.setDraftSide('left');
    wb.setDraftCrease(2);
    wb.confirmDraft();
    const after1 = wb.current;
    wb.setDraftSide('right');
    wb.setDraftCrease(1);
    wb.confirmDraft();
    expect(wb.current.columns).toHaveLength(1);

    const undone = wb.undo();
    expect(undone).toEqual({ crease: 1, side: 'right' });
    expect(wb.canRedo).toBe(true);
    expect(wb.current).toEqual(after1);

    const redone = wb.redo();
    expect(redone).toEqual({ crease: 1, side: 'right' });
    expect(wb.current.columns).toHaveLength(1);

    wb.undo();
    // 在历史分支上确认新操作：redo 栈清空
    wb.setDraftSide('left');
    wb.setDraftCrease(1);
    wb.confirmDraft();
    expect(wb.canRedo).toBe(false);
    expect(wb.past.map((o) => o.side)).toEqual(['left', 'left']);
  });

  it('最多录入 10 次操作，第 11 次被拒绝且状态不变', () => {
    const wb = new Workbench();
    wb.setInitialCells(32);
    // 32 格下连续翻左侧宽1（crease=1）始终合法：每次少一列
    for (let i = 0; i < 10; i++) {
      wb.setDraftSide('left');
      wb.setDraftCrease(1);
      expect(wb.confirmDraft()).toBe(true);
    }
    expect(wb.past).toHaveLength(10);
    expect(wb.limitReached).toBe(true);
    expect(wb.previewValid()).toBe(false);
    const before = wb.current;
    expect(wb.confirmDraft()).toBe(false);
    expect(wb.current).toBe(before);
    expect(wb.past).toHaveLength(10);
  });

  it('撤销后可以继续确认到 10 次', () => {
    const wb = new Workbench();
    wb.setInitialCells(32);
    for (let i = 0; i < 10; i++) {
      wb.setDraftSide('left');
      wb.setDraftCrease(1);
      wb.confirmDraft();
    }
    wb.undo();
    expect(wb.past).toHaveLength(9);
    wb.setDraftSide('left');
    wb.setDraftCrease(1);
    expect(wb.confirmDraft()).toBe(true);
    expect(wb.past).toHaveLength(10);
  });

  it('重置回到初始纸带', () => {
    const wb = new Workbench();
    wb.setInitialCells(5);
    wb.setDraftSide('left');
    wb.setDraftCrease(1);
    wb.confirmDraft();
    wb.reset();
    expect(wb.past).toHaveLength(0);
    expect(wb.current.columns).toHaveLength(5);
    expect(wb.canUndo).toBe(false);
    expect(wb.canRedo).toBe(false);
  });

  it('导出 JSON 与当前状态同源', () => {
    const wb = new Workbench();
    wb.setInitialCells(4);
    wb.setDraftSide('left');
    wb.setDraftCrease(2);
    wb.confirmDraft();
    const json = wb.toJson();
    expect(json.columnCount).toBe(wb.current.columns.length);
    expect(json.columns[0].bottomToTop.map((l) => l.cell)).toEqual(
      wb.current.columns[0].layers.map((l) => l.id)
    );
    expect(json.operations).toHaveLength(1);
  });
});
