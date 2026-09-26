<!--
  Full measurement history for one person (PersonDetail). Column headers are
  sort buttons (date descending by default); each row has a delete button
  that calls `ondelete(measurementId)`. Only the first `limit` rows show
  until "Show all" is pressed, so long histories don't swamp phone screens.
-->
<script>
  import Icon from '../ui/Icon.svelte';
  import EmptyState from '../ui/EmptyState.svelte';
  import { formatValue, formatDate } from '../../lib/format.js';
  import { capitalize } from '../../lib/display.js';

  let { measurements = [], ondelete, limit = 10 } = $props();

  let showAll = $state(false);

  let sortKey = $state('measured_at');
  let sortDir = $state(-1); // -1 = desc, 1 = asc

  let sorted = $derived(
    [...measurements].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    })
  );

  let visible = $derived(showAll ? sorted : sorted.slice(0, limit));

  const COLUMNS = [
    { key: 'measured_at', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'value', label: 'Value', numeric: true },
  ];

  function toggleSort(key) {
    if (sortKey === key) sortDir = -sortDir;
    else { sortKey = key; sortDir = -1; }
  }

  const ariaSort = (key) => (sortKey === key ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
</script>

{#if measurements.length === 0}
  <EmptyState message="No measurements yet." />
{:else}
  <div class="wrap">
    <table>
      <thead>
        <tr>
          {#each COLUMNS as col (col.key)}
            <th aria-sort={ariaSort(col.key)} class:num={col.numeric}>
              <button class="sort" onclick={() => toggleSort(col.key)}>
                {col.label}{sortKey === col.key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
              </button>
            </th>
          {/each}
          <th><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {#each visible as m (m.id)}
          <tr>
            <td>{formatDate(m.measured_at)}</td>
            <td>{capitalize(m.type)}</td>
            <td class="num"><strong>{formatValue(m.value)}</strong> <span class="unit">{m.unit}</span></td>
            <td class="actions">
              <button class="delete" aria-label="Delete {m.type} on {formatDate(m.measured_at)}" title="Delete" onclick={() => ondelete(m.id)}>
                <Icon name="trash" size={16} />
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if sorted.length > limit}
    <button class="more" onclick={() => { showAll = !showAll; }}>
      {showAll ? 'Show fewer' : `Show all ${sorted.length}`}
    </button>
  {/if}
{/if}

<style>
  .wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th, td {
    padding: 10px 16px;
    text-align: left;
    white-space: nowrap;
  }
  th {
    background: var(--surface-muted);
    color: var(--muted);
  }
  td {
    border-top: 1px solid var(--border-soft);
  }
  .num {
    text-align: right;
  }
  .sort {
    border: 0;
    background: none;
    padding: 0;
    font-weight: 600;
    color: inherit;
    cursor: pointer;
  }
  .unit {
    color: var(--muted);
  }
  .more {
    width: 100%;
    height: 44px;
    border: 0;
    border-top: 1px solid var(--border-soft);
    background: transparent;
    color: var(--primary);
    font-weight: 600;
    cursor: pointer;
  }
  .more:hover {
    background: var(--primary-tint);
  }
  .actions {
    width: 1%;
    padding-block: 4px;
  }
  .delete {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .delete:hover {
    background: var(--vital-tint);
    color: var(--danger);
  }
  /* Desktop: reveal delete buttons on row hover/focus to reduce clutter. */
  @media (hover: hover) {
    tr .delete { opacity: 0; }
    tr:hover .delete, .delete:focus-visible { opacity: 1; }
  }
</style>
