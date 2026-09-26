import { describe, expect, it } from 'vitest';
import { applyFold, createInitialState, validateFold } from '../src/lib/fold';
import type { FoldOp, FoldState, Layer, Side } from '../src/lib/types';
import {
  entityInitial,
  entitySimulate,
  makeRng,
  randomOp,
  simFold,
  simValid,
  type SimEntity
} from './helpers/entity-sim';

interface CellView {
  id: number;
  face: Side;
  history: string;
}

/** 把产品状态转成与实体模拟同构的列视图（自下而上） */
function productView(state: FoldState): CellView[][] {
  return state.columns.map((stack) =>
    stack.layers.map((l: Layer) => ({
      id: l.id,
      face: l.face,
      history: l.history.map((h) => `${h.index}:${h.moving}@${h.crease}`).join('|')
    }))
  );
}

function entityView(initial: number, ops: FoldOp[]): CellView[][] {
  return entitySimulate(initial, ops).map((col) =>
    col.layers.map((l) => ({
      id: l.id,
      face: l.face,
      history: l.history.map((h) => `${h.index}:${h.moving}@${h.crease}`).join('|')
    }))
  );
}

function entityColumnView(entities: SimEntity[], total: number): CellView[][] {
  const cols: CellView[][] = [];
  for (let x = 0; x < total; x++) {
    const inCol = entities.filter((e) => e.x === x).sort((a, b) => a.z - b.z);
    cols.push(
      inCol.map((e) => ({
        id: e.id,
        face: e.face,
        history: e.history.map((h) => `${h.index}:${h.moving}@${h.crease}`).join('|')
      }))
    );
  }
  return cols;
}

function runProduct(initial: number, ops: FoldOp[]): FoldState {
  let s = createInitialState(initial);
  for (const op of ops) s = applyFold(s, op);
  return s;
}

describe('实体模拟自身健全性', () => {
  it('初始实体每个一格、正面、z=0', () => {
    const es = entityInitial(5);
    expect(es.map((e) => e.id)).toEqual([1, 2, 3, 4, 5]);
    expect(es.every((e) => e.face === 'front' && e.z === 0)).toBe(true);
  });

  it('4 格左@2 给出镜像落位', () => {
    const view = entitySimulate(4, [{ crease: 2, side: 'left' }]);
    expect(
      view.map((c) => c.layers.map((l) => `${l.id}${l.face === 'front' ? 'F' : 'B'}`))
    ).toEqual([
      ['3F', '2B'],
      ['4F', '1B']
    ]);
  });
});

describe('产品引擎 vs 逐格实体模拟 对拍', () => {
  it('固定手工序列：4 格 左@2 → 右@1（连续反向）', () => {
    const ops: FoldOp[] = [
      { crease: 2, side: 'left' },
      { crease: 1, side: 'right' }
    ];
    expect(productView(runProduct(4, ops))).toEqual(entityView(4, ops));
  });

  it('固定手工序列：6 格 左@2 → 左@1 → 右@2', () => {
    const ops: FoldOp[] = [
      { crease: 2, side: 'left' },
      { crease: 1, side: 'left' },
      { crease: 2, side: 'right' }
    ];
    expect(productView(runProduct(6, ops))).toEqual(entityView(6, ops));
  });

  it('随机小纸带逐层对拍：格号守恒、面一致、层序反转一致、折叠历史一致', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = makeRng(seed * 7919 + 13);
      const initial = 2 + Math.floor(rng() * 7); // 2..8 格小纸带
      let product = createInitialState(initial);
      let entities = entityInitial(initial);
      let total = initial;

      for (let step = 0; step < 8; step++) {
        const op = randomOp(rng, total);
        const productReason = validateFold(product, op);
        const entityOk = simValid(total, op);
        expect(productReason === null).toBe(entityOk);
        if (!entityOk) {
          // 两边都判定无效：状态都不得改变（无效折痕不改变状态）
          continue;
        }
        product = applyFold(product, op);
        entities = simFold(entities, total, op, product.past.length);
        total = op.side === 'left' ? total - op.crease : op.crease;

        // 格子守恒
        const count = product.columns.reduce((n, c) => n + c.layers.length, 0);
        expect(count).toBe(initial);
        const ids = product.columns
          .flatMap((c) => c.layers.map((l) => l.id))
          .sort((a, b) => a - b);
        expect(ids).toEqual(Array.from({ length: initial }, (_, i) => i + 1));

        // 逐列逐层（含正反面与历史）一致
        expect(productView(product)).toEqual(entityColumnView(entities, total));
      }
    }
  });

  it('与 entitySimulate 整段重放（合法序列）完全一致', () => {
    for (let seed = 100; seed < 200; seed++) {
      const rng = makeRng(seed);
      const initial = 2 + Math.floor(rng() * 6);
      const ops: FoldOp[] = [];
      let total = initial;
      let guard = 0;
      while (total > 1 && guard < 12) {
        const op = randomOp(rng, total);
        guard++;
        if (!simValid(total, op)) continue;
        ops.push(op);
        total = op.side === 'left' ? total - op.crease : op.crease;
      }
      expect(productView(runProduct(initial, ops))).toEqual(entityView(initial, ops));
    }
  });
});
