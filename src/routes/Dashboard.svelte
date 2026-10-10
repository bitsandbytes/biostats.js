<!--
  People overview (route `/`).
  Desktop: a quick-add bar (record a measurement for anyone), column toggles
  per measurement type, and PeopleTable with latest values + trend lines.
  Phone: a stack of PersonCards, each with its own inline add form.
  Both layouts share the name filter; Ctrl/Cmd+K focuses it on desktop.
-->
<script>
  import { onMount, tick } from 'svelte';
  import { store as peopleStore, loadPeople, addMeasurement } from '../stores/people.svelte.js';
  import { store as typesStore, loadTypes } from '../stores/measurementTypes.svelte.js';
  import { desktop } from '../stores/viewport.svelte.js';
  import PersonCard from '../components/people/PersonCard.svelte';
  import PeopleTable from '../components/people/PeopleTable.svelte';
  import AddPersonModal from '../components/people/AddPersonModal.svelte';
  import MeasurementForm from '../components/measurements/MeasurementForm.svelte';
  import Button from '../components/ui/Button.svelte';
  import Icon from '../components/ui/Icon.svelte';
  import EmptyState from '../components/ui/EmptyState.svelte';
  import { capitalize } from '../lib/display.js';
  import { errorMessage } from '../lib/api.js';

  let showAddModal = $state(false);
  let loading = $state(true);
  let query = $state('');
  let hiddenTypes = $state([]);   // column toggles (desktop table)
  let quickPersonId = $state(''); // bound to the quick-add bar's Person select
  let quickSubmitting = $state(false);
  let searchInput = $state();
  let quickBar = $state();

  let loadError = $state('');

  // Fetches people and measurement types. A failure is shown with a Retry
  // button instead of leaving "Loading…" up forever. A 401 never reaches the
  // page: api.js logs the user out and App.svelte switches to <Login>.
  async function load() {
    loading = true;
    loadError = '';
    try {
      await Promise.all([loadPeople(), loadTypes()]);
    } catch (err) {
      loadError = errorMessage(err, 'Could not load people.');
    } finally {
      loading = false;
    }
  }

  onMount(load);

  let filtered = $derived(
    peopleStore.people.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase()))
  );

  // Every type anyone has a measurement for, in the admin-defined order,
  // followed by any free-text types not (or no longer) in the types list.
  let presentTypes = $derived.by(() => {
    const present = new Set(peopleStore.people.flatMap(p => Object.keys(p.latestByType ?? {})));
    const ordered = typesStore.types.map(t => t.label).filter(l => present.has(l));
    return [...ordered, ...[...present].filter(l => !ordered.includes(l)).sort()];
  });
  let columns = $derived(presentTypes.filter(t => !hiddenTypes.includes(t)));

  let entryCount = $derived(peopleStore.people.length);

  function toggleColumn(type) {
    hiddenTypes = hiddenTypes.includes(type) ? hiddenTypes.filter(t => t !== type) : [...hiddenTypes, type];
  }

  async function handleQuickAdd(data, { personId }) {
    quickSubmitting = true;
    try {
      await addMeasurement(personId, data);
    } finally {
      quickSubmitting = false;
    }
  }

  // "+ Add" on a table row: pick that person in the quick-add bar.
  async function prefill(personId) {
    quickPersonId = personId;
    await tick();
    quickBar?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    quickBar?.querySelector('select[id$="-unit"]')?.focus();
  }

  function onkeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="dashboard">
  <header class="header">
    <div class="title">
      <h1>People</h1>
      <p class="sub">
        {#if desktop.current}
          Latest value per measurement type, with recent readings as a trend line
        {:else}
          {entryCount} {entryCount === 1 ? 'person' : 'people'}
        {/if}
      </p>
    </div>
    {#if peopleStore.people.length > 0}
      <label class="search">
        <Icon name="search" size={16} />
        <span class="visually-hidden">Filter people by name</span>
        <input type="search" placeholder="Filter people…" bind:value={query} bind:this={searchInput} />
        {#if desktop.current}<kbd>Ctrl K</kbd>{/if}
      </label>
    {/if}
    <Button onclick={() => { showAddModal = true; }} aria-label="Add person">
      <Icon name="plus" size={18} strokeWidth={2.2} />{#if desktop.current}Add person{/if}
    </Button>
  </header>

  {#if loading}
    <p class="loading">Loading…</p>
  {:else if loadError}
    <div class="card load-error" role="alert">
      <p>{loadError}</p>
      <Button onclick={load}>Retry</Button>
    </div>
  {:else if peopleStore.people.length === 0}
    <EmptyState message="No people yet. Add someone to start tracking measurements." />
  {:else if desktop.current}
    <section class="card quick-add" aria-label="Quick add a measurement" bind:this={quickBar}>
      <div class="quick-title">
        <span class="quick-icon"><Icon name="plus" size={18} strokeWidth={2.2} /></span>
        Quick add
      </div>
      <MeasurementForm
        layout="bar"
        people={peopleStore.people}
        bind:personId={quickPersonId}
        onsubmit={handleQuickAdd}
        submitting={quickSubmitting}
      />
    </section>

    {#if presentTypes.length > 0}
      <div class="chips" role="group" aria-label="Columns">
        <span class="chips-label">Columns</span>
        {#each presentTypes as type (type)}
          <button class="chip" class:on={!hiddenTypes.includes(type)} aria-pressed={!hiddenTypes.includes(type)} onclick={() => toggleColumn(type)}>
            {capitalize(type)}
          </button>
        {/each}
      </div>
    {/if}

    <PeopleTable people={filtered} {columns} onadd={prefill} highlightId={quickPersonId} />
    <p class="hint">Click a name to open that person · “+ Add” fills in that person above · click a heading to sort</p>
  {:else}
    <div class="cards">
      {#each filtered as person (person.id)}
        <PersonCard {person} />
      {/each}
    </div>
  {/if}

  {#if !loading && !loadError && peopleStore.people.length > 0 && filtered.length === 0}
    <p class="loading">No one matches “{query}”.</p>
  {/if}

  {#if showAddModal}
    <AddPersonModal onclose={() => { showAddModal = false; }} />
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  h1 {
    margin: 0;
    font-size: 1.65rem;
    font-weight: 700;
  }
  .sub {
    margin: 2px 0 0;
    font-size: 0.9rem;
    color: var(--muted);
  }
  .search {
    order: 3;
    flex-basis: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--muted);
  }
  .search:focus-within {
    border-color: var(--primary);
  }
  .search input {
    flex: 1;
    min-width: 0;
    height: auto;
    border: 0;
    padding: 0;
    outline: none;
    background: transparent;
    color: var(--ink);
  }
  @media (min-width: 1024px) {
    .search {
      order: 0;
      flex-basis: 280px;
    }
  }

  .quick-add {
    padding: 12px 16px;
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }
  .quick-title {
    display: flex;
    align-items: center;
    gap: 10px;
    align-self: center;
    padding-right: 16px;
    border-right: 1px solid var(--border);
    height: 40px;
    font-weight: 600;
    white-space: nowrap;
  }
  .quick-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: var(--primary-tint-strong);
    color: var(--primary);
    display: grid;
    place-items: center;
  }
  .quick-add :global(.measurement-form) {
    flex: 1;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
  }
  .chips-label {
    color: var(--muted);
    margin-right: 4px;
  }
  .chip {
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
  }
  .chip.on {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
    font-weight: 600;
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .load-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
  }
  .load-error p {
    margin: 0;
    color: var(--danger);
  }
  .hint, .loading {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }
</style>
