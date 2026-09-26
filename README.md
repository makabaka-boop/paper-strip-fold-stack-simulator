# 纸带折叠工作台（Paper Strip Folding Workbench）

无后端的桌面工作台：对一条 2～32 格、全部正面朝上的纸带，逐条录入折叠操作，
先预览层叠剖面，再确认、撤销或重做，并导出与剖面同源的 JSON。

## 折叠模型

- 纸带每一列是“自下而上”的一叠纸；每次折叠后列重新从左到右编号。
- 操作 = 当前的列间折痕（第 c 列与第 c+1 列之间）+ 翻起左侧或右侧。
- 移动侧整侧绕折痕镜像，盖到静止侧**上方**：
  - 移动侧每叠的上下顺序**反转**（贴台面的层翻到最上面）；
  - 每个小格**正反面交换**；
  - 移动侧宽度不得超过静止侧（等宽对折允许）；
  - 静止侧完全不变；静止侧更宽时，超出的列保持单层。
- 无效折痕（越界 / 移动侧过宽 / 超过 10 次）不改变状态。
- 最多录入 10 次操作；撤销后可继续录入；在历史分支上确认新操作会清空重做栈。

## 技术栈

Svelte 5（Runes）+ TypeScript + Vite，状态机为纯 TS（`src/lib/workbench.ts`），
Svelte 组件只做展示与交互，因此全部业务逻辑可被 Vitest 直接测试。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173/fold/
npm test           # Vitest 一次性运行
npm run test:watch
npm run build
```

## Docker Compose 运行 fold 页面

```bash
docker compose up --build
# 浏览器打开 http://localhost:8080/fold/
```

Nginx 仅托管构建产物，没有任何后端服务；访问根路径会 302 到 `/fold/`。

## 测试如何对拍

- `src/lib/fold.ts`：产品引擎，按“反转数组 + 翻面”的方式直接建模。
- `tests/helpers/entity-sim.ts`：独立的**逐格实体物理模拟**——每个小格带
  坐标 `(x, z)`，折叠时做折痕镜像，目标列内按镜像后的高度排序堆叠、翻面、追加历史。
  两套实现没有共享逻辑。
- `tests/differential.test.ts`：
  - 手工小纸带序列（含连续相反方向折叠）逐层对拍；
  - 300 组确定性随机小纸带（2～8 格），每步检查两边的合法性判断一致、
    格号守恒（编号不重复不丢失）、逐列逐层的格号 / 正反面 / 折叠历史一致；
  - 100 组整段合法序列与实体重放对比。
- `tests/fold.test.ts`：层序反转、正反面交换、无效折痕不改变状态、等宽对折等显式断言。
- `tests/workbench.test.ts`：预览不落库、确认、撤销/重做、10 次上限、初始格数钳制。

## 导出 JSON

导出与剖面读取同一个 `FoldState`（`Workbench.toJson()` → `exportState(current)`），
结构为初始格数、列数、操作列表，以及每列**自下而上**的格号、正反面、每格折叠历史。
