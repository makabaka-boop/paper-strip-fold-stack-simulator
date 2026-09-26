<script lang="ts">
  import { workbench } from '../lib/workbench.svelte';

  let json = $derived(JSON.stringify(workbench.exportPayload, null, 2));
  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  }

  function download() {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fold-${workbench.units}units-${workbench.opsUsed}ops.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<section class="panel">
  <header class="head">
    <h2>导出 JSON</h2>
    <div class="actions">
      <button onclick={copy}>{copied ? '已复制' : '复制'}</button>
      <button onclick={download}>下载</button>
    </div>
  </header>
  <pre class="json"><code>{json}</code></pre>
</section>

<style>
  .panel {
    background: #1b2230;
    border: 1px solid #2c3648;
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  h2 {
    font-size: 15px;
    margin: 0;
    color: #e8edf5;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  button {
    padding: 5px 14px;
    border-radius: 6px;
    border: 1px solid #3a465c;
    background: #232c3e;
    color: #dbe3ef;
    font-size: 12px;
    cursor: pointer;
  }
  button:hover {
    background: #2b3649;
  }
  .json {
    margin: 0;
    padding: 10px 12px;
    background: #121826;
    border: 1px solid #2c3648;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.55;
    color: #b8c6de;
    overflow: auto;
    max-height: 320px;
    white-space: pre;
  }
</style>
