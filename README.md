# 折纸带工作台

Svelte 5 + TypeScript 的纯前端桌面工作台，模拟纸带折叠：翻起一侧整叠绕折痕镜像盖到静止侧上方——列序镜像、层叠上下反转、每格正反面交换。

## 功能

- 初始纸带 2～32 个单位格，从左到右编号，全部正面朝上
- 最多录入 10 次折叠操作：指定当前列间折痕（1 起）与翻起侧（左/右）
- 移动侧宽度不得超过静止侧；无效折痕不改变状态
- 每个当前列自下而上展示原始格编号与正反面，并记录完整折叠历史
- 先预览层叠剖面，再确认录入；支持撤销 / 重做
- 导出 JSON 与剖面图共用同一份状态

## 开发

```bash
npm install
npm run dev      # 本地开发
npm test         # Vitest：几何实体模拟对拍、格子守恒、层序反转、连续反向折叠
npm run check    # svelte-check 类型检查
npm run build    # 生产构建（输出 dist/）
```

## Docker Compose 运行

```bash
docker compose up --build
```

随后访问 http://localhost:8080 （`fold` 服务，nginx 托管静态页面，无后端）。

## 结构

```
src/lib/fold.ts            核心折叠模型（校验 + 应用，纯函数）
src/lib/simulate.ts        独立几何实体模拟（测试对拍用）
src/lib/export.ts          导出 JSON 构造
src/lib/workbench.svelte.ts 工作台状态仓库（快照栈 + 游标：预览/确认/撤销/重做）
src/components/            剖面、操作、历史、导出四个面板
tests/fold.test.ts         Vitest 对拍与性质测试
```
