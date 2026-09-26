<!--
  Phone-layout Dashboard card for one person: avatar + name (links to
  PersonDetail), last-updated date, an "Add" toggle that reveals an inline
  MeasurementForm, and a tile per measurement type with its latest value.
-->
<script>
  import Link from '../ui/Link.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import MeasurementForm from '../measurements/MeasurementForm.svelte';
  import { addMeasurement } from '../../stores/people.svelte.js'; // mutates store.people
  import { formatValue, formatDate } from '../../lib/format.js';
  import { initials, avatarTone, typeStyle, capitalize } from '../../lib/display.js';

  let { person } = $props();

  let showForm = $state(false);
  let submitting = $state(false);

  let entries = $derived(Object.entries(person.latestByType ?? {}));
  let lastDate = $derived(entries.reduce((max, [, e]) => (e.measured_at > max ? e.measured_at : max), ''));

  async function handleAdd(data) {
    submitting = true;
    try {
      await addMeasurement(person.id, data);
    } finally {
      submitting = false;
    }
  }
</script>

<article class="card person-card">
  <div class="head">
    <span class="avatar tone-{avatarTone(person.name)}">{initials(person.name)}</span>
    <div class="who">
      <Link to="/person/{person.id}" class="name">{person.name}</Link>
      <span class="sub">{lastDate ? `Updated ${formatDate(lastDate)}` : 'No measurements yet'}</span>
    </div>
    <Button variant="secondary" size="sm" onclick={() => { showForm = !showForm; }} aria-expanded={showForm}>
      {#if showForm}Close{:else}<Icon name="plus" size={16} strokeWidth={2.2} />Add{/if}
    </Button>
  </div>

  {#if entries.length}
    <div class="tiles">
      {#each entries as [type, entry] (type)}
        {@const style = typeStyle(type)}
        <div class="tile tone-{style.tone}">
          <span class="icon"><Icon name={style.icon} size={18} /></span>
          <div class="reading">
            <span class="label">{capitalize(type)}</span>
            <span class="value">{formatValue(entry.value)} <span class="unit">{entry.unit}</span></span>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if showForm}
    <div class="form-area">
      <MeasurementForm onsubmit={handleAdd} {submitting} />
    </div>
  {/if}
</article>

<style>
  .person-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-weight: 700;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .who {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .who :global(.name) {
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--ink);
    text-decoration: none;
  }
  .sub {
    font-size: 0.82rem;
    color: var(--muted);
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .tile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 12px;
    background: #f1f7f6;
    min-width: 0;
  }
  .tile.tone-vital {
    background: var(--vital-tint);
  }
  .icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: var(--primary-tint-strong);
    color: var(--primary);
  }
  .tone-vital .icon {
    background: var(--vital-tint-strong);
    color: var(--vital);
  }
  .reading {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .label {
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .value {
    font-weight: 600;
  }
  .unit {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--muted);
  }
  .form-area {
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }
</style>
