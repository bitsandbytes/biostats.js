<script>
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import * as api from '../lib/api.js';
  import { removePerson } from '../stores/people.svelte.js'; // mutates store.people
  import { loadTypes } from '../stores/measurementTypes.svelte.js';
  import MeasurementForm from '../components/measurements/MeasurementForm.svelte';
  import MeasurementTable from '../components/measurements/MeasurementTable.svelte';
  import TrendChart from '../components/charts/TrendChart.svelte';
  import DeletePersonModal from '../components/people/DeletePersonModal.svelte';
  import Button from '../components/ui/Button.svelte';

  let { id } = $props();

  let person = $state(null);
  let loading = $state(true);
  let submitting = $state(false);
  let showDeleteModal = $state(false);

  onMount(async () => {
    await loadTypes();
    person = await api.getPersonDetail(id);
    loading = false;
  });

  async function handleAddMeasurement(data) {
    submitting = true;
    try {
      const m = await api.addMeasurement(id, data);
      person.measurements = [m, ...person.measurements];
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
</script>

<div class="person-detail-wrapper">
  {#if loading}
    <p>Loading…</p>
  {:else if person}
    <div class="person-detail">
      <div class="header">
        <div>
          <h1>{person.name}</h1>
          {#if person.notes}
            <p class="notes">{person.notes}</p>
          {/if}
        </div>
        <Button variant="danger" onclick={() => { showDeleteModal = true; }}>Delete Person</Button>
      </div>

      <section>
        <h2>Add Measurement</h2>
        <MeasurementForm onsubmit={handleAddMeasurement} {submitting} />
      </section>

      <section>
        <h2>History</h2>
        <MeasurementTable measurements={person.measurements} ondelete={handleDeleteMeasurement} />
      </section>

      <section>
        <h2>Trends</h2>
        <TrendChart measurements={person.measurements} />
      </section>
    </div>
  {/if}

  {#if showDeleteModal && person}
    <DeletePersonModal {person} onconfirm={handleDeletePerson} onclose={() => { showDeleteModal = false; }} />
  {/if}
</div>

<style>
  .person-detail {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  h2 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: #374151;
  }
  .notes {
    margin: 0.25rem 0 0;
    color: #6b7280;
    font-size: 0.9rem;
  }
  section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1.25rem;
  }
</style>
