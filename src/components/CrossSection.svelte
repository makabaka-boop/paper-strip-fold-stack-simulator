<script lang="ts">
  import type { FoldState } from '../lib/types';

  interface Props {
    state: FoldState;
    highlight?: boolean;
  }

  let { state, highlight = false }: Props = $props();

  const faceText = (face: 'front' | 'back') => (face === 'front' ? '正' : '反');
  const historyText = (history: Array<{ index: number; crease: number; moving: string }>) =>
    history.length === 0
      ? '未折叠'
      : history.map((h) => `#${h.index}:${h.moving === 'left' ? 'L' : 'R'}@${h.crease}`).join(' → ');
</script>

<div class="section {highlight ? 'preview' : 'current'}" data-testid="cross-section">
  {#each state.columns as stack, ci (ci)}
    <div class="column">
      <!-- column-reverse：DOM 按自下而上书写，视觉上首项在最下方 -->
      <div class="layers">
        {#each stack.layers as layer, li (layer.id)}
          <div
            class="layer {layer.face}"
            style="order: {stack.layers.length - li}"
            title={`原始格 ${layer.id} · ${layer.face === 'front' ? '正面' : '反面'}朝上 · ${historyText(layer.history)}`}
          >
            <span class="cell-id">{layer.id}</span>
            <span class="face-mark">{faceText(layer.face)}</span>
          </div>
        {/each}
      </div>
      <div class="column-label">第{ci + 1}列</div>
    </div>
  {/each}
</div>

<style>
  .section {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    min-height: 220px;
    padding: 14px 12px;
    border: 1px solid var(--border, #d7dbe2);
    border-radius: 10px;
    background: #fff;
    overflow-x: auto;
  }
  .section.preview {
    border-color: #b8860b;
    background: #fffdf5;
  }
  .column {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
  }
  .layers {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .layer {
    width: 52px;
    height: 24px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 7px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(0, 0, 0, 0.18);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }
  .layer.front {
    background: linear-gradient(180deg, #ffe9b3, #ffd984);
    color: #5b3d00;
  }
  .layer.back {
    background: linear-gradient(180deg, #bcd8ff, #93baf5);
    color: #0d2c55;
  }
  .face-mark {
    font-size: 11px;
    opacity: 0.85;
  }
  .column-label {
    font-size: 12px;
    color: #555;
  }
</style>
