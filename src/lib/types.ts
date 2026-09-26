/**
 * 纸带折叠领域模型
 *
 * 约定：
 * - 所有“列”都按折叠后的当前状态从左到右排列；每次折叠完成后重新从 1 编号。
 * - 每一列是一叠纸，layers 自下而上存储。
 * - 一层记录：原始格编号 id、当前正反面 face、该格经历的折叠历史 history。
 * - 折叠物理含义：移动侧整侧绕折痕镜像翻转后，盖到静止侧上方；
 *   因此移动侧的“自下而上”层序会反转（原来最靠台面的层翻到最上面），
 *   且每个小格的正反面交换；静止侧一切不变。
 */

export type Side = 'front' | 'back';
export type FoldSide = 'left' | 'right';

export interface Layer {
  /** 原始格编号，与初始位置一致（最左为 1） */
  id: number;
  /** 当前朝上的面：front 正面 / back 反面 */
  face: Side;
  /** 按时间顺序记录该格参与过的折叠（1-based 折叠序号） */
  history: FoldRecord[];
}

export interface FoldRecord {
  /** 第几次折叠 */
  index: number;
  /** 折痕位置：在当前的第 c 列与第 c+1 列之间（1-based） */
  crease: number;
  /** 被翻起的是哪一侧 */
  moving: FoldSide;
}

export interface FoldOp {
  /** 折痕：当前的第 crease 列与第 crease+1 列之间，范围 1..columns-1 */
  crease: number;
  /** 翻起左侧（left）或翻起右侧（right） */
  side: FoldSide;
}

/** 一列：自下而上的一叠纸 */
export interface Stack {
  layers: Layer[];
}

export interface FoldState {
  /** 初始纸带格数 */
  initialCells: number;
  /** 当前列数（自左向右） */
  columns: Stack[];
  /** 已确认的折叠操作 */
  past: FoldOp[];
}

export type InvalidReason = 'crease-out-of-range' | 'moving-side-too-wide';

export interface FoldPreview {
  ok: boolean;
  reason?: InvalidReason;
  op: FoldOp;
  /** ok 时为折叠后的新状态；不 ok 时保持原状态 */
  state: FoldState;
}
