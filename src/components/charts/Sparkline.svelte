<!--
  Tiny trend line for a list of numbers (see src/lib/sparkline.js).
  Renders nothing with fewer than two values. `tone` is `body` (teal) or
  `vital` (coral), matching typeStyle() in src/lib/display.js.
-->
<script>
  import { sparklinePoints } from '../../lib/sparkline.js';

  let { values = [], tone = 'body', width = 80, height = 24 } = $props();

  let points = $derived(sparklinePoints(values, width, height));
</script>

{#if points}
  <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true" class="sparkline tone-{tone}">
    <polyline {points} fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
  </svg>
{/if}

<style>
  .sparkline {
    display: block;
    flex-shrink: 0;
  }
  .tone-body { color: var(--primary); }
  .tone-vital { color: var(--vital); }
</style>
