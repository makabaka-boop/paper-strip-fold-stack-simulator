/**
 * 对拍基准：逐格实体物理模拟（与产品引擎独立实现）。
 *
 * 每个小格是一个实体，带：当前列 x、列内高度 z（小者在下方）、正反面、折叠历史。
 * 折叠时：
 * - 移动侧实体绕折痕镜像到目标列（纯坐标映射）；
 * - 每个目标列内，静止实体保留原相对高度排在下方，
 *   移动实体按镜像后的相对顺序（z 大↔z 小）排在上方；
 * - 移动实体正反面交换并记录历史。
 * 这种“先镜像、再按 z 排序”的实现刻意不使用产品代码的“反转数组”逻辑，
 * 用于对拍检验层序反转是否正确。
 */
import type { FoldOp, FoldRecord, Side } from '../../src/lib/types';

export interface SimEntity {
  id: number;
  x: number;
  z: number;
  face: Side;
  history: FoldRecord[];
}

export interface SimColumn {
  /** 自下而上 */
  layers: Array<{ id: number; face: Side; history: FoldRecord[] }>;
}

export function entityInitial(n: number): SimEntity[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    x: i,
    z: 0,
    face: 'front' as Side,
    history: []
  }));
}

/** 折痕是否合法（与产品规则相同的判断，独立书写） */
export function simValid(total: number, op: FoldOp): boolean {
  if (!Number.isInteger(op.crease) || op.crease < 1 || op.crease >= total) return false;
  const moving = op.side === 'left' ? op.crease : total - op.crease;
  const still = op.side === 'left' ? total - op.crease : op.crease;
  return moving <= still;
}

/** 应用一次折叠；返回新实体数组。假定输入已通过 simValid。 */
export function simFold(entities: SimEntity[], total: number, op: FoldOp, foldIndex: number): SimEntity[] {
  const c = op.crease;
  const record: FoldRecord = { index: foldIndex, crease: c, moving: op.side };

  const isMoving = (x: number) => (op.side === 'left' ? x < c : x >= c);
  // 镜像后的新列号（静止侧保持自身坐标系）
  const mirrorX = (x: number) => (op.side === 'left' ? c - 1 - x : 2 * c - 1 - x);
  const newX = (x: number) => (isMoving(x) ? mirrorX(x) : op.side === 'left' ? x - c : x);

  const newTotal = op.side === 'left' ? total - c : c;

  const result: SimEntity[] = [];
  for (let col = 0; col < newTotal; col++) {
    const here = entities.filter((e) => newX(e.x) === col);
    const stationary = here
      .filter((e) => !isMoving(e.x))
      .sort((a, b) => a.z - b.z);
    const moving = here
      .filter((e) => isMoving(e.x))
      .sort((a, b) => b.z - a.z); // 镜像：原来高的翻到下面去，故按 z 降序作为新堆叠的由下向上

    stationary.forEach((e, i) => {
      result.push({ ...e, history: e.history.map((h) => ({ ...h })), x: col, z: i });
    });
    moving.forEach((e, i) => {
      result.push({
        id: e.id,
        x: col,
        z: stationary.length + i,
        face: e.face === 'front' ? 'back' : 'front',
        history: [...e.history.map((h) => ({ ...h })), record]
      });
    });
  }
  return result;
}

export function entitySimulate(initialCells: number, ops: FoldOp[]): SimColumn[] {
  let entities = entityInitial(initialCells);
  let total = initialCells;
  ops.forEach((op, i) => {
    if (!simValid(total, op)) return; // 无效折痕不改变状态
    entities = simFold(entities, total, op, i + 1);
    total = op.side === 'left' ? total - op.crease : op.crease;
  });

  const cols: SimColumn[] = [];
  for (let x = 0; x < total; x++) {
    const inCol = entities.filter((e) => e.x === x).sort((a, b) => a.z - b.z);
    cols.push({
      layers: inCol.map((e) => ({ id: e.id, face: e.face, history: e.history }))
    });
  }
  return cols;
}

/** 简单确定性 LCG 随机数，保证对拍测试可复现 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** 生成一条保证当前步合法（或故意无效）的随机操作 */
export function randomOp(rng: () => number, total: number): FoldOp {
  const side: 'left' | 'right' = rng() < 0.5 ? 'left' : 'right';
  // 一半概率故意尝试越界/过宽，一半概率在合法宽度内
  if (rng() < 0.25) {
    const crease = 1 + Math.floor(rng() * Math.max(1, total - 1));
    return { crease, side };
  }
  // 合法 crease：left 要求 crease <= total-crease ⇒ crease <= floor(total/2)
  //              right 要求 total-crease <= crease ⇒ crease >= ceil(total/2)
  const lo = side === 'left' ? 1 : Math.ceil(total / 2);
  const hi = side === 'left' ? Math.floor(total / 2) : total - 1;
  if (lo > hi) return { crease: 1, side };
  const crease = lo + Math.floor(rng() * (hi - lo + 1));
  return { crease, side };
}
