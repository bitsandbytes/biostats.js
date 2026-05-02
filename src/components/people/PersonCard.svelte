<script>
  import { Link } from 'svelte-routing';
  import Button from '../ui/Button.svelte';
  import MeasurementForm from '../measurements/MeasurementForm.svelte';
  import { addMeasurement } from '../../stores/people.svelte.js'; // mutates store.people
  import { formatValue, formatDate } from '../../lib/format.js';

  let { person } = $props();

  let showForm = $state(false);
  let submitting = $state(false);

  async function handleAdd(data) {
    submitting = true;
    try {
      await addMeasurement(person.id, data);
      showForm = false;
    } finally {
      submitting = false;
    }
  }
</script>

<div class="card">
  <div class="card-header">
    <Link to="/person/{person.id}" class="name">{person.name}</Link>
    <Button variant="ghost" onclick={() => { showForm = !showForm; }}>
      {showForm ? 'Cancel' : '+ Add'}
    </Button>
  </div>

  <div class="latest">
    {#if Object.keys(person.latestByType).length === 0}
      <p class="no-data">No measurements yet.</p>
    {:else}
      {#each Object.entries(person.latestByType) as [type, entry]}
        <div class="latest-row">
          <span class="type">{type}</span>
          <span class="val">{formatValue(entry.value)} {entry.unit}</span>
          <span class="date">{formatDate(entry.measured_at)}</span>
        </div>
      {/each}
    {/if}
  </div>

  {#if showForm}
    <div class="form-area">
      <MeasurementForm onsubmit={handleAdd} {submitting} />
    </div>
  {/if}
</div>

<style>
  .card {
    background: white;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-header :global(.name) {
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    color: #1d4ed8;
  }
  .latest {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .latest-row {
    display: flex;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: #374151;
  }
  .type {
    font-weight: 500;
    min-width: 80px;
  }
  .val {
    flex: 1;
  }
  .date {
    color: #9ca3af;
    font-size: 0.8rem;
  }
  .no-data {
    font-size: 0.875rem;
    color: #9ca3af;
    margin: 0;
  }
  .form-area {
    border-top: 1px solid #e5e7eb;
    padding-top: 0.75rem;
  }
</style>
