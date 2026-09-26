<script lang="ts">
  import { workbench } from './lib/workbench.svelte';
  import { MIN_UNITS, MAX_UNITS } from './lib/fold';
  import StripSection from './components/StripSection.svelte';
  import Controls from './components/Controls.svelte';
  import HistoryPanel from './components/HistoryPanel.svelte';
  import ExportPanel from './components/ExportPanel.svelte';

  const unitOptions = Array.from(
    { length: MAX_UNITS - MIN_UNITS + 1 },
    (_, i) => MIN_UNITS + i,
  );

  function onUnitsChange(e: Event) {
    workbench.reset(Number((e.target as HTMLSelectElement).value));
  }
</script>

<div class="app">
  <header class="topbar">
    <h1>折纸带工作台</h1>
    <div class="setup">
      <label>
        初始格数
        <select value={workbench.units} onchange={onUnitsChange}>
          {#each unitOptions as n (n)}
            <option value={n}>{n}</option>
          {/each}
        </select>
      </label>
      <button class="reset" onclick={() => workbench.reset(workbench.units)}>重置</button>
    </div>
  </header>

  <main class="layout">
    <div class="left">
      <Controls />
      <div class="sections">
        <StripSection state={workbench.current} title="当前剖面" />
        {#if workbench.preview !== null}
          <StripSection
            state={workbench.preview}
            title="预览剖面"
            subtitle="折痕 {workbench.draft.crease} · 翻起{workbench.draft.side === 'left' ? '左' : '右'}侧"
          />
        {:else}
          <section class="panel invalid">
            <h2>预览剖面</h2>
            <p>当前折痕无效，不产生预览；确认后也不会改变状态。</p>
          </section>
        {/if}
      </div>
    </div>
    <aside class="right">
      <HistoryPanel />
      <ExportPanel />
    </aside>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #10151f;
    color: #dbe3ef;
    font-family:
      'Segoe UI',
      'PingFang SC',
      'Microsoft YaHei',
      system-ui,
      sans-serif;
  }
  .app {
    max-width: 1440px;
    margin: 0 auto;
    padding: 18px 22px 32px;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #232c3e;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  h1 {
    font-size: 20px;
    margin: 0;
    color: #eef2f9;
  }
  .setup {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: #8b96a9;
  }
  .setup label {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  select {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #3a465c;
    background: #121826;
    color: #e8edf5;
    font-size: 13px;
  }
  .reset {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid #3a465c;
    background: #232c3e;
    color: #dbe3ef;
    font-size: 13px;
    cursor: pointer;
  }
  .reset:hover {
    background: #2b3649;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 980px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  .left {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    align-items: start;
  }
  .right {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .panel.invalid {
    background: #1b2230;
    border: 1px dashed #3a465c;
    border-radius: 10px;
    padding: 14px 16px;
  }
  .panel.invalid h2 {
    font-size: 15px;
    margin: 0 0 8px;
    color: #8b96a9;
  }
  .panel.invalid p {
    margin: 0;
    font-size: 13px;
    color: #66718a;
  }
</style>
