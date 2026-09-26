import { describe, expect, it } from 'vitest';
import { applyFold, createInitialState, previewFold, validateFold } from '../src/lib/fold';
import { exportState } from '../src/lib/serialize';
import type { FoldOp, FoldState, Layer } from '../src/lib/types';

/** 取某状态的扁平快照：每列自下而上 [格号/面] */
function snapshot(state: FoldState): string[][] {
  return state.columns.map((stack) =>
    stack.layers.map((l) => `${l.id}${l.face === 'front' ? 'F' : 'B'}`)
  );
}

function idsBottomToTop(state: FoldState): number[][] {
  return state.columns.map((s) => s.layers.map((l) => l.id));
}

describe('初始纸带', () => {
  it('2～32 格编号从左到右、各自一列、全部正面朝上、无折叠历史', () => {
    for (const n of [2, 3, 16, 32]) {
      const s = createInitialState(n);
      expect(s.columns).toHaveLength(n);
      s.columns.forEach((stack, i) => {
        expect(stack.layers).toHaveLength(1);
        expect(stack.layers[0]).toMatchObject({ id: i + 1, face: 'front' });
        expect(stack.layers[0].history).toEqual([]);
      });
    }
  });
});

describe('无效折痕不改变状态', () => {
  it('折痕越界（0、负数、列数本身、列数+1、非整数）均被拒绝', () => {
    const s = createInitialState(4);
    for (const crease of [0, -1, 4, 5, 1.5]) {
      const op: FoldOp = { crease: crease as number, side: 'left' };
      expect(validateFold(s, op)).toBe('crease-out-of-range');
      const preview = previewFold(s, op);
      expect(preview.ok).toBe(false);
      expect(preview.reason).toBe('crease-out-of-range');
      expect(preview.state).toBe(s);
      expect(applyFold(s, op)).toBe(s);
    }
  });

  it('移动侧宽度大于静止侧时拒绝，且不写历史', () => {
    let s = createInitialState(5);
    // 翻左侧 crease=3：宽 3 > 2
    expect(validateFold(s, { crease: 3, side: 'left' })).toBe('moving-side-too-wide');
    const rejected = previewFold(s, { crease: 3, side: 'left' });
    expect(rejected.ok).toBe(false);
    expect(rejected.state).toBe(s);
    // 翻右侧 crease=2：右侧宽 3 > 2
    expect(validateFold(s, { crease: 2, side: 'right' })).toBe('moving-side-too-wide');
    s = applyFold(s, { crease: 2, side: 'left' }); // 合法：左2 ≤ 右3
    // 折后剩 3 列；再翻右侧 crease=1：右宽2 > 左宽1，拒绝
    expect(validateFold(s, { crease: 1, side: 'right' })).toBe('moving-side-too-wide');
    expect(snapshot(s)).toEqual([['3F', '2B'], ['4F', '1B'], ['5F']]);
  });

  it('等宽对折允许', () => {
    const s = createInitialState(4);
    expect(validateFold(s, { crease: 2, side: 'left' })).toBeNull();
    expect(validateFold(s, { crease: 2, side: 'right' })).toBeNull();
  });
});

describe('层序反转与正反面交换', () => {
  it('4 格翻左侧@2：静止格在下、移动格层序反转在上、移动格反面', () => {
    const s = applyFold(createInitialState(4), { crease: 2, side: 'left' });
    expect(snapshot(s)).toEqual([
      ['3F', '2B'],
      ['4F', '1B']
    ]);
    expect(s.past).toHaveLength(1);
  });

  it('4 格翻右侧@2：与翻左侧@2 同宽对折时格号落位互为镜像', () => {
    const s = applyFold(createInitialState(4), { crease: 2, side: 'right' });
    expect(snapshot(s)).toEqual([
      ['1F', '4B'],
      ['2F', '3B']
    ]);
  });

  it('5 格翻左侧@2：宽侧突出的第 3 列不被覆盖，保持单层正面', () => {
    const s = applyFold(createInitialState(5), { crease: 2, side: 'left' });
    expect(snapshot(s)).toEqual([['3F', '2B'], ['4F', '1B'], ['5F']]);
  });

  it('同一格再次被翻起时层序再次反转、面再交换、历史追加', () => {
    // 4 格：左@2 -> 列宽2；再右@1（右宽1=左宽1）：
    // 折叠前自下而上：列1 [3F,2B] 列2 [4F,1B]
    // 翻起右侧列2，反转后 [1F,4B] 盖到列1 [3F,2B] 之上
    const s = [
      { crease: 2, side: 'left' as const },
      { crease: 1, side: 'right' as const }
    ].reduce((st, op) => applyFold(st, op), createInitialState(4));
    expect(s.columns).toHaveLength(1);
    expect(snapshot(s)[0]).toEqual(['3F', '2B', '1F', '4B']);
    const byId = new Map<number, Layer>(s.columns[0].layers.map((l) => [l.id, l]));
    // 格 1：两次都在移动侧 -> 正面（翻两次），历史长度 2
    expect(byId.get(1)!.face).toBe('front');
    expect(byId.get(1)!.history).toHaveLength(2);
    // 格 3：只在第一次静止、第二次静止 -> 正面、无历史
    expect(byId.get(3)!.face).toBe('front');
    expect(byId.get(3)!.history).toHaveLength(0);
    // 格 4：第一次静止（右），第二次被翻 -> 反面，历史长度 1
    expect(byId.get(4)!.face).toBe('back');
    expect(byId.get(4)!.history).toHaveLength(1);
    // 格 2：第一次被翻（左），第二次静止 -> 反面，历史长度 1
    expect(byId.get(2)!.face).toBe('back');
    expect(byId.get(2)!.history).toHaveLength(1);
  });
});

describe('连续反向折叠（对拍实体模拟在另一个文件，这里做手工小纸带逐层验证）', () => {
  it('3 格 左@1 然后 右@1（连续相反方向）', () => {
    // 左@1：列1=[2F,1B]，列2=[3F]
    // 右@1（宽1≤1）：右侧列2 反转 [3B] 盖到列1 -> [2F,1B,3B]
    const s = [
      { crease: 1, side: 'left' as const },
      { crease: 1, side: 'right' as const }
    ].reduce((st, op) => applyFold(st, op), createInitialState(3));
    expect(s.columns).toHaveLength(1);
    expect(snapshot(s)[0]).toEqual(['2F', '1B', '3B']);
  });

  it('2 格对折后仅剩 1 列：任何折痕都无效，状态保持层序反转结果', () => {
    let s = applyFold(createInitialState(2), { crease: 1, side: 'left' });
    expect(s.columns).toHaveLength(1);
    expect(snapshot(s)[0]).toEqual(['2F', '1B']);
    // 再无列间折痕：无论翻哪一侧都无效，状态不变
    for (const side of ['left', 'right'] as const) {
      expect(validateFold(s, { crease: 1, side })).toBe('crease-out-of-range');
      s = applyFold(s, { crease: 1, side });
    }
    expect(snapshot(s)[0]).toEqual(['2F', '1B']);
  });

  it('4 格同向连续对折：每次整叠层序反转、面交替', () => {
    let s = createInitialState(4);
    s = applyFold(s, { crease: 2, side: 'left' });
    expect(snapshot(s)).toEqual([
      ['3F', '2B'],
      ['4F', '1B']
    ]);
    // 2 列再左@1：翻起第 1 列 [3F,2B]，反转+翻面 -> [2F,3B]，盖到第 2 列上
    s = applyFold(s, { crease: 1, side: 'left' });
    expect(s.columns).toHaveLength(1);
    expect(snapshot(s)[0]).toEqual(['4F', '1B', '2F', '3B']);
  });
});

describe('格子守恒', () => {
  it('一串随机折叠后总格数（含所有列的层数之和）恒等于初始格数，且编号不重复', () => {
    const ops: FoldOp[] = [
      { crease: 3, side: 'left' },
      { crease: 1, side: 'right' },
      { crease: 1, side: 'left' }
    ];
    let s = createInitialState(7);
    for (const op of ops) {
      const before = s.columns.reduce((n, c) => n + c.layers.length, 0);
      s = applyFold(s, op);
      const after = s.columns.reduce((n, c) => n + c.layers.length, 0);
      expect(after).toBe(before);
    }
    const all = s.columns.flatMap((c) => c.layers.map((l) => l.id)).sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 7 }, (_, i) => i + 1));
  });
});

describe('折叠历史', () => {
  it('历史按时间记录折痕与翻起方向，静止侧不追加', () => {
    const s = applyFold(createInitialState(4), { crease: 2, side: 'left' });
    const col0 = s.columns[0].layers;
    // 列1 自下而上 3（静止，无历史），2（移动，第1次）
    expect(col0[0].history).toEqual([]);
    expect(col0[1].history).toEqual([{ index: 1, crease: 2, moving: 'left' }]);
    const col1 = s.columns[1].layers;
    expect(col1[0].history).toEqual([]); // 4 静止
    expect(col1[1].history).toEqual([{ index: 1, crease: 2, moving: 'left' }]); // 1 移动
  });
});

describe('导出 JSON 与状态同源', () => {
  it('导出内容逐列等于当前状态自下而上', () => {
    const s = applyFold(createInitialState(4), { crease: 2, side: 'left' });
    const json = exportState(s, new Date('2026-09-26T00:00:00Z'));
    expect(json.initialCells).toBe(4);
    expect(json.columnCount).toBe(2);
    expect(json.operations).toEqual([
      { step: 1, crease: 2, side: 'left', action: '翻左侧@折痕2' }
    ]);
    expect(json.columns[0].bottomToTop.map((l) => l.cell)).toEqual([3, 2]);
    expect(json.columns[0].bottomToTop.map((l) => l.face)).toEqual(['front', 'back']);
    expect(json.columns[1].bottomToTop.map((l) => l.cell)).toEqual([4, 1]);
    expect(idsBottomToTop(s)[0]).toEqual(json.columns[0].bottomToTop.map((l) => l.cell));
  });
});
