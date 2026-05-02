<script>
  import Button from '../ui/Button.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import { formatValue, formatDate } from '../../lib/format.js';

  let { measurements = [], ondelete } = $props();

  let sortKey = $state('measured_at');
  let sortDir = $state(-1); // -1 = desc, 1 = asc

  let sorted = $derived(
    [...measurements].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return av < bv ? sortDir : av > bv ? -sortDir : 0;
    })
  );

  function toggleSort(key) {
    if (sortKey === key) sortDir = -sortDir;
    else { sortKey = key; sortDir = -1; }
  }
</script>

{#if measurements.length === 0}
  <EmptyState message="No measurements yet." />
{:else}
  <table class="table">
    <thead>
      <tr>
        <th onclick={() => toggleSort('type')}>Type</th>
        <th onclick={() => toggleSort('value')}>Value</th>
        <th onclick={() => toggleSort('unit')}>Unit</th>
        <th onclick={() => toggleSort('measured_at')}>Date</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each sorted as m (m.id)}
        <tr>
          <td>{m.type}</td>
          <td>{formatValue(m.value)}</td>
          <td>{m.unit}</td>
          <td>{formatDate(m.measured_at)}</td>
          <td>
            <Button variant="ghost" onclick={() => ondelete(m.id)}>Delete</Button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th, td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  th {
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    user-select: none;
  }
  th:hover {
    background: #f3f4f6;
  }
  td:last-child {
    text-align: right;
  }
</style>
