<script lang="ts">
  import CrossSection from './components/CrossSection.svelte';
  import { MAX_CELLS, MIN_CELLS, sideLabel } from './lib/fold';
  import { OP_LIMIT, Workbench } from './lib/workbench';
  import type { FoldState } from './lib/types';

  // $state 深度代理：纯 TS 工作台状态机由此变成 Svelte 响应式状态，
  // 剖面组件与导出按钮读取的是同一份状态。
  const wb = $state(new Workbench());

  let cellInput = $state(wb.initialCells);
  let exportedJson = $state('');
  let flash = $state('');

  const previewState = $derived.by<FoldState>(() => wb.preview());
  const previewValid = $derived(wb.previewValid());
  const invalidText = $derived.by(() => {
    if (wb.limitReached) return `已达 ${OP_LIMIT} 次操作上限，请先撤销或重置`;
    const reason = wb.invalidReason;
    if (reason === 'crease-out-of-range') return '无效折痕：折痕必须位于当前列之间，状态未改变';
    if (reason === 'moving-side-too-wide') return '移动侧宽度超过静止侧，状态未改变';
    return '';
  });

  const faceText = (face: 'front' | 'back') => (face === 'front' ? '正' : '反');
  const historyText = (history: Array<{ index: number; crease: number; moving: string }>) =>
    history.length === 0
      ? '—'
      : history
          .map((h) => `第${h.index}次(${h.moving === 'left' ? '翻左' : '翻右'}@${h.crease})`)
          .join(' → ');

  function applyCells() {
    wb.setInitialCells(cellInput);
    cellInput = wb.initialCells;
  }

  function confirm() {
    const ok = wb.confirmDraft();
    flash = ok ? '已确认，预览结果成为当前状态' : '操作无效，状态未改变';
    if (ok) exportedJson = '';
  }

  function undo() {
    wb.undo();
    exportedJson = '';
    flash = '已撤销';
  }

  function redo() {
    wb.redo();
    exportedJson = '';
    flash = '已重做';
  }

  function reset() {
    wb.reset();
    cellInput = wb.initialCells;
    exportedJson = '';
    flash = '已重置为初始纸带';
  }

  function exportJson() {
    exportedJson = JSON.stringify(wb.toJson(), null, 2);
    const blob = new Blob([exportedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paper-fold-${wb.initialCells}-cells-${wb.past.length}-folds.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash = '已导出 JSON（与剖面共用同一状态）';
  }

  // 供预览摘要：预览后的列数
  const previewColumnCount = $derived(previewState.columns.length);
</script>

<main class="workbench">
  <header>
    <h1>纸带折叠工作台</h1>
    <p class="subtitle">
      整侧绕折痕镜像后盖到静止侧上方：层序反转、正反面交换。先看预览剖面，再确认 / 撤销 / 重做。
    </p>
  </header>

  <section class="panel controls">
    <div class="row">
      <label>
        初始格数（{MIN_CELLS}–{MAX_CELLS}）
        <input
          type="number"
          min={MIN_CELLS}
          max={MAX_CELLS}
          bind:value={cellInput}
          onchange={applyCells}
        />
      </label>
      <button type="button" onclick={applyCells}>重建纸带</button>
      <button type="button" onclick={reset}>重置</button>
    </div>

    <div class="row">
      <label>
        折痕位置（第
        <input
          type="number"
          min="1"
          max={Math.max(1, wb.current.columns.length - 1)}
          bind:value={wb.draftOp.crease}
        />
        列与下一列之间）
      </label>
      <label class="side">
        <input type="radio" value="left" bind:group={wb.draftOp.side} /> 翻左侧盖到右侧
      </label>
      <label class="side">
        <input type="radio" value="right" bind:group={wb.draftOp.side} /> 翻右侧盖到左侧
      </label>
    </div>

    <div class="row actions">
      <button type="button" class="primary" onclick={confirm} disabled={!previewValid}>
        确认折叠
      </button>
      <button type="button" onclick={undo} disabled={!wb.canUndo}>撤销</button>
      <button type="button" onclick={redo} disabled={!wb.canRedo}>重做</button>
      <button type="button" onclick={exportJson}>导出 JSON</button>
      <span class="counter" class:warn={wb.limitReached}>
        已确认 {wb.past.length} / {OP_LIMIT} 次
        {#if wb.redoStack.length > 0}· 可重做 {wb.redoStack.length} 次{/if}
      </span>
    </div>

    {#if invalidText}<p class="invalid">{invalidText}</p>{/if}
    {#if flash && !invalidText}<p class="flash">{flash}</p>{/if}
  </section>

  <section class="panel">
    <h2>① 层叠剖面预览（待确认）</h2>
    <p class="hint">
      当前录入：{sideLabel(wb.draftOp.side)} · 折痕在第 {wb.draftOp.crease} 列后 ·
      折叠后共 {previewColumnCount} 列
      {#if !previewValid}<strong>（本次操作无效，以下等于当前状态，确认后不会改变任何内容）</strong>{/if}
    </p>
    <CrossSection state={previewState} highlight={previewValid} />
  </section>

  <section class="panel">
    <h2>② 当前层叠剖面（已确认）</h2>
    <p class="hint">
      每列自上而下渲染；悬停小格可见其完整折叠历史。
      <span class="legend"><i class="sw front"></i>正面朝上</span>
      <span class="legend"><i class="sw back"></i>反面朝上</span>
    </p>
    <CrossSection state={wb.current} />
  </section>

  <section class="panel">
    <h2>③ 每列自下而上：原始格编号 / 正反面 / 折叠历史</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>当前列</th>
            <th>自下而上（格号·面·折叠历史）</th>
          </tr>
        </thead>
        <tbody>
          {#each wb.current.columns as stack, ci (ci)}
            <tr>
              <td>第{ci + 1}列</td>
              <td>
                <ol class="stack-list">
                  {#each stack.layers as layer (layer.id)}
                    <li class="{layer.face}">
                      <strong>{layer.id}</strong>
                      <span class="tag {layer.face}">{faceText(layer.face)}</span>
                      <span class="hist">{historyText(layer.history)}</span>
                    </li>
                  {/each}
                </ol>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel">
    <h2>④ 操作历史</h2>
    {#if wb.past.length === 0}
      <p class="hint">尚无已确认操作。</p>
    {:else}
      <ol class="ops">
        {#each wb.past as op, i (i)}
          <li>
            第{i + 1}次：{sideLabel(op.side)}，折痕第 {op.crease} 列与第 {op.crease + 1} 列之间
          </li>
        {/each}
      </ol>
    {/if}
  </section>

  {#if exportedJson}
    <section class="panel">
      <h2>⑤ 导出的 JSON（与当前剖面同源）</h2>
      <pre class="json">{exportedJson}</pre>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #f3f5f9;
    color: #1f2430;
  }
  .workbench {
    max-width: 1080px;
    margin: 0 auto;
    padding: 24px 20px 64px;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 26px;
  }
  h2 {
    font-size: 16px;
    margin: 0 0 8px;
  }
  .subtitle {
    margin: 0 0 18px;
    color: #555;
    font-size: 14px;
  }
  .panel {
    background: #fff;
    border: 1px solid #e2e6ee;
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(20, 30, 60, 0.05);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    margin-bottom: 10px;
    font-size: 14px;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  label.side {
    gap: 4px;
  }
  input[type='number'] {
    width: 64px;
    padding: 5px 8px;
    border: 1px solid #c6ccd8;
    border-radius: 6px;
    font-size: 14px;
  }
  button {
    padding: 7px 14px;
    border: 1px solid #9aa6bb;
    background: #f7f9fc;
    border-radius: 7px;
    cursor: pointer;
    font-size: 14px;
  }
  button:hover:not(:disabled) {
    background: #eef2f8;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  button.primary {
    background: #2357d6;
    border-color: #2357d6;
    color: #fff;
  }
  button.primary:hover:not(:disabled) {
    background: #1e4bb8;
  }
  .counter {
    font-size: 13px;
    color: #555;
  }
  .counter.warn {
    color: #b3401f;
    font-weight: 600;
  }
  .invalid {
    color: #b3401f;
    font-size: 13px;
    margin: 6px 0 0;
  }
  .flash {
    color: #1d7a3c;
    font-size: 13px;
    margin: 6px 0 0;
  }
  .hint {
    font-size: 13px;
    color: #666;
    margin: 0 0 10px;
  }
  .hint strong {
    color: #b3401f;
  }
  .legend {
    margin-left: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .sw {
    display: inline-block;
    width: 14px;
    height: 10px;
    border-radius: 2px;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }
  .sw.front {
    background: #ffd984;
  }
  .sw.back {
    background: #93baf5;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
  }
  th,
  td {
    border: 1px solid #e2e6ee;
    padding: 8px 10px;
    vertical-align: top;
    text-align: left;
  }
  th {
    background: #f7f9fc;
  }
  .stack-list {
    margin: 0;
    padding-left: 18px;
  }
  .stack-list li {
    margin-bottom: 3px;
  }
  .tag {
    display: inline-block;
    min-width: 20px;
    text-align: center;
    border-radius: 4px;
    padding: 0 5px;
    margin: 0 6px;
    font-size: 12px;
    border: 1px solid rgba(0, 0, 0, 0.15);
  }
  .tag.front {
    background: #ffe9b3;
  }
  .tag.back {
    background: #bcd8ff;
  }
  .hist {
    color: #555;
  }
  .ops {
    margin: 0;
    padding-left: 20px;
    font-size: 14px;
  }
  .ops li {
    margin-bottom: 4px;
  }
  .json {
    background: #11151c;
    color: #d7e0ee;
    border-radius: 8px;
    padding: 14px;
    font-size: 12px;
    overflow-x: auto;
    max-height: 360px;
    overflow-y: auto;
  }
</style>
