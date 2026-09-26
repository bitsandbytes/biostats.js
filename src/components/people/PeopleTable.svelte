<!--
  Desktop Dashboard table: one row per person, one column per measurement
  type showing the latest value plus a sparkline of `recentByType`. Name and
  "Last entry" headers sort; the row's "+ Add" button calls `onadd(personId)`
  (the Dashboard pre-fills its quick-add bar with that person).
-->
<script>
  import Link from '../ui/Link.svelte';
  import Button from '../ui/Button.svelte';
  import Sparkline from '../charts/Sparkline.svelte';
  import { formatValue, formatDate } from '../../lib/format.js';
  import { initials, avatarTone, typeStyle, capitalize } from '../../lib/display.js';

  let { people = [], columns = [], onadd, highlightId = '' } = $props();

  let sortKey = $state('name'); // 'name' | 'last'
  let sortDir = $state(1);      // 1 = asc, -1 = desc

  const lastEntry = (p) =>
    Object.values(p.latestByType ?? {}).reduce((max, e) => (e.measured_at > max ? e.measured_at : max), '');

  let rows = $derived(
    [...people].sort((a, b) => {
      const av = sortKey === 'name' ? a.name.toLowerCase() : lastEntry(a);
      const bv = sortKey === 'name' ? b.name.toLowerCase() : lastEntry(b);
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    })
  );

  function sortBy(key) {
    if (sortKey === key) sortDir = -sortDir;
    else { sortKey = key; sortDir = key === 'last' ? -1 : 1; }
  }

  const ariaSort = (key) => (sortKey === key ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
  const arrow = (key) => (sortKey === key ? (sortDir === 1 ? '↑' : '↓') : '');
</script>

<div class="card table-wrap">
  <table>
    <thead>
      <tr>
        <th aria-sort={ariaSort('name')}><button class="sort" onclick={() => sortBy('name')}>Person {arrow('name')}</button></th>
        {#each columns as type (type)}
          <th>{capitalize(type)}</th>
        {/each}
        <th aria-sort={ariaSort('last')}><button class="sort" onclick={() => sortBy('last')}>Last entry {arrow('last')}</button></th>
        <th><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as person (person.id)}
        {@const empty = Object.keys(person.latestByType ?? {}).length === 0}
        <tr class:highlight={person.id === highlightId}>
          <td>
            <Link to="/person/{person.id}" class="person-link">
              <span class="avatar tone-{avatarTone(person.name)}">{initials(person.name)}</span>{person.name}
            </Link>
          </td>
          {#if empty}
            <td colspan={columns.length} class="none">No measurements yet</td>
          {:else}
            {#each columns as type (type)}
              {@const latest = person.latestByType[type]}
              <td>
                {#if latest}
                  <span class="cell">
                    <span class="value">{formatValue(latest.value)} <span class="unit">{latest.unit}</span></span>
                    <Sparkline
                      values={(person.recentByType?.[type] ?? []).filter(e => e.unit === latest.unit).map(e => e.value)}
                      tone={typeStyle(type).tone}
                      width={88}
                      height={20}
                    />
                  </span>
                {:else}
                  <span class="dash">—</span>
                {/if}
              </td>
            {/each}
          {/if}
          <td class="date">{empty ? '—' : formatDate(lastEntry(person))}</td>
          <td class="actions">
            <Button variant="secondary" size="sm" onclick={() => onadd(person.id)} aria-label="Add measurement for {person.name}">+ Add</Button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th {
    background: var(--surface-muted);
    color: var(--muted);
    font-weight: 600;
    text-align: left;
    vertical-align: bottom;
    padding: 12px 16px;
  }
  .sort {
    border: 0;
    background: none;
    padding: 0;
    font-weight: 600;
    color: inherit;
    cursor: pointer;
  }
  .sort:hover {
    color: var(--ink);
  }
  td {
    padding: 10px 16px;
    border-top: 1px solid var(--border-soft);
    white-space: nowrap;
  }
  tr.highlight td {
    background: var(--primary-tint);
  }
  tbody tr:hover td {
    background: var(--bg);
  }
  td :global(.person-link) {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    color: var(--ink);
    text-decoration: none;
  }
  td :global(.person-link:hover) {
    color: var(--primary);
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
    display: grid;
    place-items: center;
  }
  /* Value stacked above its sparkline keeps many type columns within the page. */
  .cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .value {
    font-weight: 600;
  }
  .unit {
    font-weight: 500;
    color: var(--muted);
    font-size: 0.82rem;
  }
  .dash {
    color: var(--faint);
  }
  .none {
    color: var(--muted);
    font-style: italic;
  }
  .date {
    color: var(--muted);
  }
  .actions {
    text-align: right;
    width: 1%;
  }
</style>
