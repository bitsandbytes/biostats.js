<!--
  Record-a-measurement form, used in three places:
  - Dashboard quick-add bar (`people` passed → shows a Person select, `layout="bar"`)
  - Dashboard phone cards (inline, one person)
  - PersonDetail side panel (`layout="stacked"`)

  A single grouped <select> picks the unit; its parent type becomes the
  measurement's `type` and the unit's abbreviation its `unit`.
  Calls `onsubmit(data, { personId })` where `data` is the POST body
  `{ type, value, unit, measured_at }`. After a successful save only the
  value is cleared (person, unit and date stay) and the value field is
  re-focused, so several readings can be entered in a row.
-->
<script>
  import Button from '../ui/Button.svelte';
  import { store as measurementTypesStore } from '../../stores/measurementTypes.svelte.js';
  import { today } from '../../lib/format.js';

  let {
    onsubmit,
    submitting = false,
    people = null,
    personId = $bindable(''),
    layout = 'inline',
    submitLabel = 'Save',
  } = $props();

  const uid = $props.id();

  let unitId = $state('');
  let value = $state('');
  let measured_at = $state(today());
  let error = $state('');
  let valueInput = $state();

  let types = $derived(measurementTypesStore.types);
  let canSubmit = $derived(!submitting && unitId && value !== '' && measured_at && (!people || personId));

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
    error = '';
    try {
      await onsubmit(
        { type: found.type.label, value: Number(value), unit: found.unit.abbreviation, measured_at },
        { personId },
      );
      value = '';
      valueInput?.focus();
    } catch (err) {
      error = err?.message ?? err?.error ?? 'Could not save the measurement.';
    }
  }
</script>

<form class="measurement-form layout-{layout}" onsubmit={handleSubmit}>
  {#if people}
    <label class="field field-person">
      <span>Person</span>
      <select id="{uid}-person" bind:value={personId} required>
        <option value="">Select person…</option>
        {#each people as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </label>
  {/if}
  <label class="field field-unit">
    <span>Unit</span>
    <select id="{uid}-unit" bind:value={unitId} required>
      <option value="">Select unit…</option>
      {#each types as type (type.id)}
        <optgroup label={type.label}>
          {#each type.units as unit (unit.id)}
            <option value={unit.id}>{unit.label} ({unit.abbreviation})</option>
          {/each}
        </optgroup>
      {/each}
    </select>
  </label>
  <div class="pair">
    <label class="field field-value">
      <span>Value</span>
      <input id="{uid}-value" type="number" step="any" inputmode="decimal" placeholder="0.0" bind:value bind:this={valueInput} required />
    </label>
    <label class="field field-date">
      <span>Date</span>
      <input id="{uid}-date" type="date" bind:value={measured_at} required />
    </label>
  </div>
  <div class="submit">
    <Button type="submit" disabled={!canSubmit}>{submitting ? 'Saving…' : submitLabel}</Button>
    {#if layout === 'bar'}<span class="hint"><kbd>Enter</kbd> to save</span>{/if}
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</form>

<style>
  .measurement-form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.78rem;
    color: var(--muted);
    min-width: 0;
  }
  .field select, .field input {
    width: 100%;
    color: var(--ink);
  }
  .pair {
    display: flex;
    gap: 0.75rem;
  }
  .field-unit { flex: 1 1 200px; }
  .field-person { flex: 1 1 170px; }
  .field-value { width: 100px; }
  .field-date { width: 160px; }
  .submit {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .error {
    flex-basis: 100%;
    margin: 0;
    color: var(--danger);
    font-size: 0.85rem;
  }

  /* Desktop quick-add bar: everything on one row. */
  .layout-bar {
    flex-wrap: nowrap;
  }
  .layout-bar .field-person { flex: 0 1 190px; }
  .layout-bar .field-unit { flex: 0 1 230px; }

  /* Side panel: full-width unit, value + date side by side, full-width button. */
  .layout-stacked {
    flex-direction: column;
    align-items: stretch;
  }
  .layout-stacked .field-unit, .layout-stacked .field-person { flex: none; }
  .layout-stacked .pair > .field { flex: 1; width: auto; }
  .layout-stacked .submit :global(.btn) { width: 100%; }
</style>
