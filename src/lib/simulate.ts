/**
 * 实体几何模拟：与 fold.ts 的数组实现完全独立，
 * 把每个单位格视为截面平面上的质点 (x, z)，折叠 = 绕折痕线旋转 180°
 * 再平移落到静止叠上方。仅供测试对拍使用。
 */
import type { Cell, FoldOp, StripState } from './fold';

export interface PhysCell extends Cell {
  /** 列坐标 */
  x: number;
  /** 高度层 */
  z: number;
}

export function toPhys(state: StripState): PhysCell[] {
  const out: PhysCell[] = [];
  state.columns.forEach((stack, x) => {
    stack.forEach((cell, z) => out.push({ ...cell, x, z }));
  });
  return out;
}

export function fromPhys(cells: PhysCell[]): StripState {
  const xs = [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b);
  const columns = xs.map((x) =>
    cells
      .filter((c) => c.x === x)
      .sort((a, b) => a.z - b.z)
      .map(({ id, faceUp }) => ({ id, faceUp })),
  );
  return { columns };
}

/**
 * 刚体几何折叠：移动侧每个格子绕折痕线 x = crease-0.5 旋转 180°
 * （x 镜像、z 取负、翻面），再按目标列整体抬升，落到静止叠顶面。
 * 注意：本函数不做合法性校验，仅接受合法操作。
 */
export function simulateFold(state: StripState, op: FoldOp): StripState {
  const cells = toPhys(state);
  const creaseLine = op.crease - 0.5;
  const isMoving = (c: PhysCell) =>
    op.side === 'left' ? c.x < creaseLine : c.x > creaseLine;

  const staying = cells.filter((c) => !isMoving(c));
  const moved = cells
    .filter(isMoving)
    .map((c) => ({ ...c, x: 2 * creaseLine - c.x, z: -c.z, faceUp: !c.faceUp }));

  const placed: PhysCell[] = [...staying];
  const targets = [...new Set(moved.map((c) => c.x))];
  for (const t of targets) {
    const st = staying.filter((c) => c.x === t);
    const mv = moved.filter((c) => c.x === t);
    const restHeight = st.length > 0 ? Math.max(...st.map((c) => c.z)) + 1 : 0;
    const zMin = Math.min(...mv.map((c) => c.z));
    const shift = restHeight - zMin;
    for (const c of mv) placed.push({ ...c, z: c.z + shift });
  }
  return fromPhys(placed);
}
