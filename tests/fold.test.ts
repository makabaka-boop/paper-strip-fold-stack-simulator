import { describe, it, expect } from 'vitest';
import {
  applyFold,
  countCells,
  initialStrip,
  validateFold,
  MAX_OPS,
  MAX_UNITS,
  MIN_UNITS,
  type Cell,
  type FoldOp,
  type StripState,
} from '../src/lib/fold';
import { simulateFold } from '../src/lib/simulate';
import { buildExport } from '../src/lib/export';

/** 简写：u(id) 正面朝上，d(id) 背面朝上 */
const u = (id: number): Cell => ({ id, faceUp: true });
const d = (id: number): Cell => ({ id, faceUp: false });
const cols = (...stacks: Cell[][]): StripState => ({ columns: stacks });

/** mulberry32 确定性伪随机数 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 枚举当前状态下的全部合法操作，随机取一个 */
function randomValidOp(state: StripState, rand: () => number): FoldOp | null {
  const n = state.columns.length;
  const valid: FoldOp[] = [];
  for (let crease = 1; crease <= n - 1; crease++) {
    for (const side of ['left', 'right'] as const) {
      const op: FoldOp = { crease, side };
      if (validateFold(state, op) === null) valid.push(op);
    }
  }
  return valid.length === 0 ? null : valid[Math.floor(rand() * valid.length)]!;
}

function sortedIds(state: StripState): number[] {
  return state.columns
    .flat()
    .map((c) => c.id)
    .sort((a, b) => a - b);
}

describe('初始纸带', () => {
  it('2~32 格全部正面朝上、从左到右编号', () => {
    for (const n of [MIN_UNITS, 3, 16, MAX_UNITS]) {
      const s = initialStrip(n);
      expect(s.columns).toHaveLength(n);
      expect(s.columns.every((stack, i) => stack.length === 1 && stack[0]!.id === i + 1 && stack[0]!.faceUp)).toBe(true);
    }
  });

  it('超出 2~32 范围抛错', () => {
    expect(() => initialStrip(1)).toThrow(RangeError);
    expect(() => initialStrip(33)).toThrow(RangeError);
    expect(() => initialStrip(2.5)).toThrow(RangeError);
  });
});

describe('无效折痕不改变状态', () => {
  const s = initialStrip(5);

  it.each([
    [{ crease: 0, side: 'left' } as FoldOp, 'CREASE_OUT_OF_RANGE'],
    [{ crease: 5, side: 'left' } as FoldOp, 'CREASE_OUT_OF_RANGE'],
    [{ crease: -1, side: 'right' } as FoldOp, 'CREASE_OUT_OF_RANGE'],
    [{ crease: 1.5, side: 'left' } as FoldOp, 'CREASE_OUT_OF_RANGE'],
    [{ crease: 4, side: 'left' } as FoldOp, 'MOVING_SIDE_TOO_WIDE'], // 左 4 列 > 右 1 列
    [{ crease: 1, side: 'right' } as FoldOp, 'MOVING_SIDE_TOO_WIDE'], // 右 4 列 > 左 1 列
  ])('%o → %s，applyFold 返回 null', (op, err) => {
    expect(validateFold(s, op)).toBe(err);
    expect(applyFold(s, op)).toBeNull();
    expect(s.columns).toHaveLength(5); // 原状态未被改动
  });

  it('移动侧与静止侧等宽是合法边界', () => {
    expect(validateFold(initialStrip(4), { crease: 2, side: 'left' })).toBeNull();
    expect(validateFold(initialStrip(4), { crease: 2, side: 'right' })).toBeNull();
  });
});

describe('层序反转与翻面', () => {
  it('单层移动列：列序镜像且每格翻面', () => {
    const s = applyFold(initialStrip(5), { crease: 2, side: 'left' });
    expect(s).toEqual(cols([u(3), d(2)], [u(4), d(1)], [u(5)]));
  });

  it('多层移动列：整叠自下而上顺序反转、逐格翻面', () => {
    // 先折出多层：8 格右半盖左半 → 每列两层
    const s1 = applyFold(initialStrip(8), { crease: 4, side: 'right' })!;
    expect(s1).toEqual(cols([u(1), d(8)], [u(2), d(7)], [u(3), d(6)], [u(4), d(5)]));
    // 再翻左侧两列：移动叠 [u(1),d(8)] 应反转为 [u(8),d(1)] 盖到目标列顶
    const s2 = applyFold(s1, { crease: 2, side: 'left' })!;
    expect(s2).toEqual(
      cols([u(3), d(6), u(7), d(2)], [u(4), d(5), u(8), d(1)]),
    );
  });

  it('applyFold 不修改入参状态', () => {
    const s = applyFold(initialStrip(6), { crease: 3, side: 'left' })!;
    const before = JSON.stringify(s);
    applyFold(s, { crease: 1, side: 'right' });
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('连续反向折叠', () => {
  it('先右后左：8 格 right@4 → left@2', () => {
    const s1 = applyFold(initialStrip(8), { crease: 4, side: 'right' })!;
    const s2 = applyFold(s1, { crease: 2, side: 'left' })!;
    expect(s2).toEqual(
      cols([u(3), d(6), u(7), d(2)], [u(4), d(5), u(8), d(1)]),
    );
  });

  it('先左后右：6 格 left@3 → 等宽对折后 right@2 非法、right@1 合法', () => {
    const s1 = applyFold(initialStrip(6), { crease: 3, side: 'left' })!;
    expect(s1).toEqual(cols([u(4), d(3)], [u(5), d(2)], [u(6), d(1)]));
    // 反向折：右侧 2 列 > 左侧 1 列，非法
    expect(applyFold(s1, { crease: 1, side: 'right' })).toBeNull();
    // 左侧 1 列折回右侧
    const s2 = applyFold(s1, { crease: 1, side: 'left' })!;
    expect(s2).toEqual(cols([u(5), d(2), u(3), d(4)], [u(6), d(1)]));
  });

  it('左右交替三折与几何模拟一致', () => {
    let s = initialStrip(8);
    const ops: FoldOp[] = [
      { crease: 4, side: 'right' },
      { crease: 2, side: 'left' },
      { crease: 1, side: 'right' },
    ];
    for (const op of ops) {
      const next = applyFold(s, op);
      expect(next).not.toBeNull();
      expect(next).toEqual(simulateFold(s, op));
      s = next!;
    }
    // 三折后只剩 1 列 8 层
    expect(s.columns).toHaveLength(1);
    expect(countCells(s)).toBe(8);
  });
});

describe('格子守恒', () => {
  it('随机折叠序列下总数不变且编号仍是 1..n 的排列', () => {
    const rand = rng(20260926);
    for (let trial = 0; trial < 100; trial++) {
      const n = 2 + Math.floor(rand() * 7); // 2~8 格小纸带
      let s = initialStrip(n);
      for (let step = 0; step < MAX_OPS; step++) {
        const op = randomValidOp(s, rand);
        if (op === null) break;
        s = applyFold(s, op)!;
        expect(countCells(s)).toBe(n);
        expect(sortedIds(s)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
      }
    }
  });
});

describe('对拍：数组实现 vs 几何实体模拟', () => {
  it('小纸带随机序列逐步一致', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rand = rng(seed);
      const n = 2 + Math.floor(rand() * 7); // 2~8 格
      let s = initialStrip(n);
      for (let step = 0; step < MAX_OPS; step++) {
        const op = randomValidOp(s, rand);
        if (op === null) break;
        const fast = applyFold(s, op);
        const phys = simulateFold(s, op);
        expect(fast, `seed=${seed} step=${step} op=${JSON.stringify(op)}`).toEqual(phys);
        s = fast!;
      }
    }
  });

  it('穷尽 4 格纸带的全部合法操作序列（深度 4）', () => {
    function walk(s: StripState, depth: number, path: FoldOp[]) {
      const n = s.columns.length;
      for (let crease = 1; crease <= n - 1; crease++) {
        for (const side of ['left', 'right'] as const) {
          const op: FoldOp = { crease, side };
          const next = applyFold(s, op);
          if (next === null) continue;
          expect(next, `path=${JSON.stringify(path.concat(op))}`).toEqual(simulateFold(s, op));
          if (depth > 1) walk(next, depth - 1, path.concat(op));
        }
      }
    }
    walk(initialStrip(4), 4, []);
  });
});

describe('导出 JSON 与剖面共用状态', () => {
  it('列自下而上、正反面与历史一致', () => {
    const s1 = applyFold(initialStrip(4), { crease: 2, side: 'left' })!;
    const payload = buildExport(4, s1, [
      { step: 1, crease: 2, side: 'left', columnsBefore: 4, columnsAfter: 2 },
    ]);
    expect(payload).toEqual({
      initialUnits: 4,
      currentColumns: 2,
      columns: [
        { position: 1, layers: [{ id: 3, face: 'up' }, { id: 2, face: 'down' }] },
        { position: 2, layers: [{ id: 4, face: 'up' }, { id: 1, face: 'down' }] },
      ],
      history: [{ step: 1, crease: 2, side: 'left', columnsBefore: 4, columnsAfter: 2 }],
    });
  });
});
