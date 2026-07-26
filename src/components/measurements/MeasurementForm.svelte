<script>
  import Button from '../ui/Button.svelte';
  import { store as measurementTypesStore } from '../../stores/measurementTypes.svelte.js';
  import { today } from '../../lib/format.js';

  let { onsubmit, submitting = false } = $props();

  let unitId = $state('');
  let value = $state('');
  let measured_at = $state(today());

  let types = $derived(measurementTypesStore.types);

  function findUnit(id) {
    for (const type of types) {
      const unit = type.units.find(u => u.id === id);
      if (unit) return { type, unit };
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = findUnit(unitId);
    if (!found) return;
    await onsubmit({
      type: found.type.label,
      value: Number(value),
      unit: found.unit.abbreviation,
      measured_at,
    });
    unitId = '';
    value = '';
    measured_at = today();
  }
</script>

<form class="measurement-form" onsubmit={handleSubmit}>
  <div class="fields">
    <div class="field field-value">
      <label for="mf-value">Value</label>
      <input id="mf-value" type="number" step="any" bind:value required />
    </div>
    <div class="field">
      <label for="mf-unit">Unit</label>
      <select id="mf-unit" bind:value={unitId} required>
        <option value="">Select unit…</option>
        {#each types as type (type.id)}
          <optgroup label={type.label}>
            {#each type.units as unit (unit.id)}
              <option value={unit.id}>{unit.label} ({unit.abbreviation})</option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="mf-date">Date</label>
      <input id="mf-date" type="date" bind:value={measured_at} required />
    </div>
  </div>
  <Button type="submit" disabled={submitting || !unitId || !value || !measured_at}>
    {submitting ? 'Saving…' : 'Add'}
  </Button>
</form>

<style>
  .measurement-form {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .fields {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 120px;
    flex: 1;
  }
  .field-value {
    max-width: 100px;
    flex: 0 1 100px;
  }
  label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
  }
  input[type="number"],
  input[type="date"],
  select {
    padding: 0.45rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    background: white;
  }
</style>
