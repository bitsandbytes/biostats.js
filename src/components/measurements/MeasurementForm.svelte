<script>
  import Button from '../ui/Button.svelte';
  import { typeNames, suggestUnits } from '../../stores/measurementTypes.svelte.js';
  import { today } from '../../lib/format.js';

  let { onsubmit, submitting = false } = $props();

  let type = $state('');
  let value = $state('');
  let unit = $state('');
  let measured_at = $state(today());

  let types = $derived(typeNames());
  let unitOptions = $derived(suggestUnits(type));

  async function handleSubmit(e) {
    e.preventDefault();
    await onsubmit({ type, value: Number(value), unit, measured_at });
    type = '';
    value = '';
    unit = '';
    measured_at = today();
  }
</script>

<form class="measurement-form" onsubmit={handleSubmit}>
  <div class="fields">
    <div class="field">
      <label for="mf-type">Type</label>
      <select id="mf-type" bind:value={type} onchange={() => { unit = ''; }} required>
        <option value="">Select type…</option>
        {#each types as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </div>
    <div class="field field-value">
      <label for="mf-value">Value</label>
      <input id="mf-value" type="number" step="any" bind:value required />
    </div>
    <div class="field">
      <label for="mf-unit">Unit</label>
      <select id="mf-unit" bind:value={unit} required disabled={!type}>
        <option value="">Select unit…</option>
        {#each unitOptions as u}
          <option value={u}>{u}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="mf-date">Date</label>
      <input id="mf-date" type="date" bind:value={measured_at} required />
    </div>
  </div>
  <Button type="submit" disabled={submitting || !type || !value || !unit || !measured_at}>
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
  select:disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
  }
</style>
