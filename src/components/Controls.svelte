<script lang="ts">
  import { workbench, DRAFT_ERROR_TEXT } from '../lib/workbench.svelte';
  import { MAX_OPS } from '../lib/fold';

  let maxCrease = $derived(Math.max(1, workbench.columnCount - 1));

  function onCreaseInput(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    workbench.draft.crease = v;
  }
</script>

<section class="panel controls">
  <h2>折叠操作</h2>

  <div class="row">
    <label class="field">
      <span>折痕位置（1 ~ {maxCrease}）</span>
      <input
        type="number"
        min="1"
        max={maxCrease}
        step="1"
        value={workbench.draft.crease}
        oninput={onCreaseInput}
        disabled={workbench.columnCount < 2}
      />
    </label>

    <fieldset class="field side">
      <legend>翻起一侧</legend>
      <label>
        <input type="radio" bind:group={workbench.draft.side} value="left" />
        左侧
      </label>
      <label>
        <input type="radio" bind:group={workbench.draft.side} value="right" />
        右侧
      </label>
    </fieldset>
  </div>

  {#if workbench.draftError !== null}
    <p class="error" role="alert">{DRAFT_ERROR_TEXT[workbench.draftError]}</p>
  {:else}
    <p class="ok">预览有效，可确认录入</p>
  {/if}

  <div class="row buttons">
    <button class="primary" onclick={() => workbench.confirm()} disabled={workbench.preview === null}>
      确认折叠
    </button>
    <button onclick={() => workbench.undo()} disabled={!workbench.canUndo}>撤销</button>
    <button onclick={() => workbench.redo()} disabled={!workbench.canRedo}>重做</button>
    <span class="counter">已录入 {workbench.opsUsed} / {MAX_OPS} 次</span>
  </div>
</section>

<style>
  .panel {
    background: #1b2230;
    border: 1px solid #2c3648;
    border-radius: 10px;
    padding: 14px 16px;
  }
  h2 {
    font-size: 15px;
    margin: 0 0 12px;
    color: #e8edf5;
  }
  .row {
    display: flex;
    gap: 18px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: #8b96a9;
  }
  .field input[type='number'] {
    width: 110px;
    padding: 7px 10px;
    border-radius: 6px;
    border: 1px solid #3a465c;
    background: #121826;
    color: #e8edf5;
    font-size: 14px;
  }
  .side {
    border: 1px solid #2c3648;
    border-radius: 8px;
    padding: 6px 12px 8px;
    flex-direction: row;
    gap: 14px;
  }
  .side legend {
    padding: 0 4px;
  }
  .side label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #cdd6e4;
    font-size: 13px;
    margin-right: 12px;
  }
  .error {
    color: #ff8a8a;
    font-size: 13px;
    margin: 10px 0 0;
  }
  .ok {
    color: #7fd6a4;
    font-size: 13px;
    margin: 10px 0 0;
  }
  .buttons {
    margin-top: 12px;
    align-items: center;
  }
  button {
    padding: 8px 18px;
    border-radius: 7px;
    border: 1px solid #3a465c;
    background: #232c3e;
    color: #dbe3ef;
    font-size: 13px;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: #2b3649;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  button.primary {
    background: #2f6fed;
    border-color: #2f6fed;
    color: #fff;
    font-weight: 600;
  }
  button.primary:hover:not(:disabled) {
    background: #3d7bf0;
  }
  .counter {
    margin-left: auto;
    font-size: 12px;
    color: #8b96a9;
  }
</style>
