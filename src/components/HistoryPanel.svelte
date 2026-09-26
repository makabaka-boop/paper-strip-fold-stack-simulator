<script lang="ts">
  import { workbench } from '../lib/workbench.svelte';
</script>

<section class="panel">
  <h2>折叠历史</h2>
  <ol class="history">
    <li class:current={workbench.cursor === 0}>
      <span class="step">初始</span>
      <span class="desc">{workbench.units} 格，全部正面朝上</span>
    </li>
    {#each workbench.records as rec, i (rec.step)}
      {@const applied = i < workbench.cursor}
      <li class:current={applied && i === workbench.cursor - 1} class:undone={!applied}>
        <span class="step">#{rec.step}</span>
        <span class="desc">
          折痕 {rec.crease}，翻起{rec.side === 'left' ? '左' : '右'}侧
          （{rec.columnsBefore} 列 → {rec.columnsAfter} 列）
        </span>
      </li>
    {/each}
  </ol>
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
    margin: 0 0 10px;
    color: #e8edf5;
  }
  .history {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 260px;
    overflow-y: auto;
  }
  li {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
    color: #aeb8ca;
    border: 1px solid transparent;
  }
  li.current {
    background: #232c3e;
    border-color: #3a465c;
    color: #e8edf5;
  }
  li.undone {
    opacity: 0.4;
  }
  .step {
    font-weight: 600;
    color: #7fa6f5;
    min-width: 34px;
  }
  li.current .step {
    color: #9dbcff;
  }
</style>
