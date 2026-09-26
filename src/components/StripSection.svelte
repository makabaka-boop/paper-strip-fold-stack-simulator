<script lang="ts">
  import type { StripState } from '../lib/fold';

  let { state, title, subtitle = '' }: { state: StripState; title: string; subtitle?: string } =
    $props();

  let maxHeight = $derived(Math.max(1, ...state.columns.map((c) => c.length)));
  let totalCells = $derived(state.columns.reduce((s, c) => s + c.length, 0));
</script>

<section class="panel">
  <header class="panel-head">
    <h2>{title}</h2>
    <span class="meta">
      {state.columns.length} 列 · {totalCells} 格{subtitle ? ` · ${subtitle}` : ''}
    </span>
  </header>
  <div class="strip" style:--rows={maxHeight}>
    {#each state.columns as stack, i (i)}
      <div class="column">
        <div class="stack">
          {#each stack as cell (cell.id)}
            <div
              class="cell"
              class:down={!cell.faceUp}
              title="原始格 {cell.id} · {cell.faceUp ? '正面朝上' : '背面朝上'}"
            >
              <span class="num">{cell.id}</span>
              <span class="face">{cell.faceUp ? '正' : '背'}</span>
            </div>
          {/each}
        </div>
        <div class="col-label">列{i + 1}</div>
      </div>
    {/each}
  </div>
  <p class="hint">每列自下而上为层叠顺序</p>
</section>

<style>
  .panel {
    background: #1b2230;
    border: 1px solid #2c3648;
    border-radius: 10px;
    padding: 14px 16px;
    min-width: 0;
  }
  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  h2 {
    font-size: 15px;
    margin: 0;
    color: #e8edf5;
  }
  .meta {
    font-size: 12px;
    color: #8b96a9;
    white-space: nowrap;
  }
  .strip {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    overflow-x: auto;
    padding: 10px 4px 4px;
    min-height: calc(var(--rows) * 34px + 30px);
  }
  .column {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .stack {
    display: flex;
    flex-direction: column-reverse; /* 数组首元素（底层）渲染在下方 */
    gap: 3px;
    justify-content: flex-start;
  }
  .cell {
    width: 46px;
    height: 31px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: #f4f6fa;
    color: #1b2230;
    border: 1px solid #c8d0dd;
    font-weight: 600;
  }
  .cell.down {
    background: repeating-linear-gradient(45deg, #39445a 0 6px, #323c50 6px 12px);
    color: #d7deea;
    border-color: #4a5670;
  }
  .num {
    font-size: 14px;
  }
  .face {
    font-size: 10px;
    opacity: 0.75;
    font-weight: 400;
  }
  .col-label {
    font-size: 11px;
    color: #8b96a9;
  }
  .hint {
    margin: 8px 0 0;
    font-size: 11px;
    color: #66718a;
  }
</style>
