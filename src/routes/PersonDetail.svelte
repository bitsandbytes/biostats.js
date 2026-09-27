<!--
  One person's measurements (route `/person/:id`).

  Desktop: breadcrumb with a person switcher, header actions (time range,
  CSV export, delete), a two-axis TrendChart, a tile per series that toggles
  it on/off the chart, and the full history table; a right-hand panel holds
  the record-measurement form and recent entries.
  Phone: the same sections stacked in one column.

  Measurement history is fetched here on demand (not kept in a global store)
  and re-fetched whenever the `id` prop changes, e.g. via the switcher.
-->
<script>
  import { untrack } from 'svelte';
  import { navigate } from '../stores/router.svelte.js';
  import * as api from '../lib/api.js';
  import { store as peopleStore, loadPeople, removePerson } from '../stores/people.svelte.js';
  import { loadTypes } from '../stores/measurementTypes.svelte.js';
  import { buildSeries, toggleSeries, filterByRange, defaultSelection, seriesStyles, RANGES } from '../lib/chartSeries.js';
  import { measurementsToCsv } from '../lib/csv.js';
  import { formatValue, formatDate, today } from '../lib/format.js';
  import { typeStyle, capitalize } from '../lib/display.js';
  import MeasurementForm from '../components/measurements/MeasurementForm.svelte';
  import MeasurementTable from '../components/measurements/MeasurementTable.svelte';
  import TrendChart from '../components/charts/TrendChart.svelte';
  import Sparkline from '../components/charts/Sparkline.svelte';
  import DeletePersonModal from '../components/people/DeletePersonModal.svelte';
  import Button from '../components/ui/Button.svelte';
  import Icon from '../components/ui/Icon.svelte';
  import Link from '../components/ui/Link.svelte';

  let { id } = $props();

  let person = $state(null);
  let loading = $state(true);
  let loadError = $state('');
  let submitting = $state(false);
  let showDeleteModal = $state(false);
  let range = $state('all');
  let selected = $state([]); // series keys shown on the chart

  const unitOf = (key) => key.slice(key.indexOf('|') + 1);

  // Re-load when `id` changes. untrack() so state read inside load() (e.g.
  // the people store) doesn't make this effect re-run on unrelated changes.
  $effect(() => {
    const personId = id;
    untrack(() => load(personId));
  });

  async function load(personId) {
    loading = true;
    loadError = '';
    selected = [];
    try {
      const [detail] = await Promise.all([
        api.getPersonDetail(personId),
        loadTypes(),
        peopleStore.people.length ? null : loadPeople(),
      ]);
      person = detail;
      selected = defaultSelection(buildSeries(detail.measurements));
    } catch (err) {
      person = null;
      loadError = err?.error ?? 'Could not load this person.';
    } finally {
      loading = false;
    }
  }

  let series = $derived(person ? buildSeries(person.measurements) : []);
  let styles = $derived(seriesStyles(selected, unitOf));
  let chartSeries = $derived(
    series
      .filter(s => selected.includes(s.key))
      .map(s => ({ key: s.key, label: capitalize(s.type), unit: s.unit, points: filterByRange(s.points, range, today()) }))
  );
  let recent = $derived(person ? person.measurements.slice(0, 5) : []);

  async function handleAddMeasurement(data) {
    submitting = true;
    try {
      const m = await api.addMeasurement(id, data);
      person.measurements = [m, ...person.measurements].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
      const key = `${m.type}|${m.unit}`;
      if (selected.length === 0) selected = [key];
    } finally {
      submitting = false;
    }
  }

  async function handleDeleteMeasurement(measurementId) {
    await api.deleteMeasurement(id, measurementId);
    person.measurements = person.measurements.filter(m => m.id !== measurementId);
  }

  async function handleDeletePerson() {
    await removePerson(id);
    navigate('/');
  }

  function exportCsv() {
    const csv = measurementsToCsv(person.name, person.measurements);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${person.name.replace(/[^\w-]+/g, '-')}-measurements.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

{#if loading && !person}
  <p class="status">Loading…</p>
{:else if loadError}
  <p class="status">{loadError} <Link to="/">Back to people</Link></p>
{:else if person}
  <div class="detail">
    <div class="head">
      <nav class="crumbs" aria-label="Breadcrumb">
        <Link to="/" class="crumb-link"><Icon name="chevron-left" size={18} />People</Link>
        {#if peopleStore.people.length > 1}
          <label class="switcher">
            <span class="visually-hidden">Switch person</span>
            <select value={id} onchange={(e) => navigate(`/person/${e.currentTarget.value}`)}>
              {#each peopleStore.people as p (p.id)}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>
          </label>
        {/if}
      </nav>

      <div class="title-row">
        <div class="title">
          <h1>{person.name}</h1>
          {#if person.notes}<p class="notes">{person.notes}</p>{/if}
        </div>
        <div class="actions">
          <div class="ranges" role="group" aria-label="Time range">
            {#each RANGES as r (r.id)}
              <button class:on={range === r.id} aria-pressed={range === r.id} onclick={() => { range = r.id; }}>{r.label}</button>
            {/each}
          </div>
          <Button variant="quiet" onclick={exportCsv} disabled={person.measurements.length === 0} title="Download all measurements as CSV">
            <Icon name="download" size={16} />Export
          </Button>
          <Button variant="quiet" onclick={() => { showDeleteModal = true; }} aria-label="Delete person" title="Delete person">
            <Icon name="trash" size={16} />
          </Button>
        </div>
      </div>
    </div>

    <section class="card chart-card" aria-label="Trend chart">
      {#if chartSeries.length}
        <div class="legend">
          {#each chartSeries as s (s.key)}
            <span class="legend-item">
              <svg width="18" height="4" aria-hidden="true"><line x1="0" y1="2" x2="18" y2="2" stroke={styles[s.key].color} stroke-width="3" stroke-dasharray={styles[s.key].dashed ? '5 3' : null} /></svg>
              {s.label} · {s.unit} ({styles[s.key].axis})
            </span>
          {/each}
        </div>
      {/if}
      <TrendChart
        series={chartSeries}
        {styles}
        emptyMessage={series.length ? 'Nothing in this time range — pick a tile below or a wider range.' : 'No measurements yet. Record one to see a trend.'}
      />
    </section>

    {#if series.length}
      <div class="tiles" role="group" aria-label="Chart series">
        {#each series as s (s.key)}
          {@const on = selected.includes(s.key)}
          <button
            class="tile"
            class:on
            style:--series-color={on ? styles[s.key]?.color : null}
            aria-pressed={on}
            onclick={() => { selected = toggleSeries(selected, s.key, unitOf); }}
          >
            <span class="tile-top">
              <span class="tile-label">{capitalize(s.type)}</span>
              <span class="tile-value">{formatValue(s.latest.value)} <span class="unit">{s.unit}</span></span>
            </span>
            <Sparkline values={s.points.slice(-12).map(p => +p.value)} tone={typeStyle(s.type).tone} width={140} height={32} />
          </button>
        {/each}
      </div>
      <p class="hint">Click a tile to add or remove it from the chart — up to two units at a time, one per axis.</p>
    {/if}

    <aside class="side">
      <section class="card panel">
        <h2>Record measurement</h2>
        <MeasurementForm layout="stacked" onsubmit={handleAddMeasurement} {submitting} submitLabel="Save measurement" />
      </section>
      {#if recent.length}
        <section class="card panel">
          <h2>Recent</h2>
          <ul class="recent">
            {#each recent as m (m.id)}
              <li>
                <span class="r-type">{capitalize(m.type)}</span>
                <strong>{formatValue(m.value)} {m.unit}</strong>
                <span class="r-date">{formatDate(m.measured_at)}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </aside>

    <section class="card history">
      <h2>History <span class="count">({person.measurements.length})</span></h2>
      <MeasurementTable measurements={person.measurements} ondelete={handleDeleteMeasurement} />
    </section>
  </div>

  {#if showDeleteModal}
    <DeletePersonModal {person} onconfirm={handleDeletePerson} onclose={() => { showDeleteModal = false; }} />
  {/if}
{/if}

<style>
  .status {
    color: var(--muted);
  }
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'head' 'chart' 'tiles' 'hint' 'side' 'history';
    gap: 16px;
  }
  @media (min-width: 1024px) {
    .detail {
      grid-template-columns: minmax(0, 1fr) 320px;
      grid-template-areas:
        'head    side'
        'chart   side'
        'tiles   side'
        'hint    side'
        'history side';
      grid-template-rows: auto auto auto auto 1fr;
      column-gap: 24px;
    }
    .side {
      position: sticky;
      top: 28px;
      align-self: start;
    }
  }
  .head { grid-area: head; display: flex; flex-direction: column; gap: 10px; }
  .chart-card { grid-area: chart; }
  .tiles { grid-area: tiles; }
  .hint { grid-area: hint; }
  .side { grid-area: side; display: flex; flex-direction: column; gap: 16px; }
  .history { grid-area: history; }

  .crumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  .crumbs :global(.crumb-link) {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 32px;
    text-decoration: none;
    font-weight: 500;
  }
  .switcher select {
    height: 32px;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .title {
    flex: 1;
    min-width: 200px;
  }
  h1 {
    margin: 0;
    font-size: 1.85rem;
    font-weight: 700;
  }
  .notes {
    margin: 2px 0 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .ranges {
    display: flex;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 3px;
  }
  .ranges button {
    height: 32px;
    min-width: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--muted);
    font-size: 0.82rem;
    cursor: pointer;
  }
  .ranges button.on {
    background: var(--primary);
    color: white;
    font-weight: 600;
  }

  .chart-card {
    padding: 16px 16px 8px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .tile {
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    cursor: pointer;
    min-width: 0;
  }
  .tile:hover {
    border-color: var(--primary-border);
  }
  .tile.on {
    border: 2px solid var(--series-color);
    padding: 11px 13px;
  }
  .tile-top {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .tile-label {
    flex: 1;
    font-size: 0.82rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tile.on .tile-label {
    color: var(--series-color);
    font-weight: 600;
  }
  .tile-value {
    font-weight: 700;
    font-size: 1.05rem;
    white-space: nowrap;
  }
  .unit {
    font-weight: 500;
    font-size: 0.82rem;
    color: var(--muted);
  }
  .hint {
    margin: -6px 0 0;
    font-size: 0.82rem;
    color: var(--muted);
  }

  .panel {
    padding: 18px;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 1.05rem;
    font-weight: 600;
  }
  .history h2 {
    padding: 16px 16px 0;
  }
  .count {
    color: var(--muted);
    font-weight: 500;
  }
  .history {
    overflow: hidden;
  }
  .recent {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .recent li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    border-top: 1px solid var(--border-soft);
    font-size: 0.9rem;
  }
  .r-type {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .r-date {
    width: 90px;
    text-align: right;
    color: var(--muted);
    font-size: 0.82rem;
  }
</style>
