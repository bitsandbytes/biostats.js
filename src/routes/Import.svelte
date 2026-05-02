<script>
  import Button from '../components/ui/Button.svelte';
  import * as api from '../lib/api.js';
  import { parseCsv, applyMapping, REQUIRED_COLUMNS } from '../lib/csv.js';

  let columns = $state([]);
  let rows = $state([]);
  let mapping = $state({});
  let result = $state(null);
  let error = $state('');
  let submitting = $state(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    error = '';
    result = null;
    try {
      const parsed = await parseCsv(file);
      columns = parsed.columns;
      rows = parsed.rows;
      // Auto-map columns whose names already match required names
      mapping = Object.fromEntries(
        columns
          .filter(c => REQUIRED_COLUMNS.includes(c))
          .map(c => [c, c])
      );
    } catch {
      error = 'Failed to parse CSV.';
    }
  }

  let preview = $derived(rows.slice(0, 10));
  let mappingComplete = $derived(REQUIRED_COLUMNS.every(r => Object.values(mapping).includes(r)));

  async function handleImport() {
    submitting = true;
    error = '';
    try {
      const mapped = applyMapping(rows, mapping);
      result = await api.importData({ rows: mapped });
    } catch (err) {
      error = err?.message ?? 'Import failed.';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="import">
  <h1>Import CSV</h1>

  <div class="dropzone">
    <label for="csv-file">Choose a CSV file</label>
    <input id="csv-file" type="file" accept=".csv" onchange={handleFile} />
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if result}
    <div class="result">
      <p>Import complete: {result.created} created, {result.skipped} skipped, {result.errors} errors.</p>
    </div>
  {/if}

  {#if columns.length > 0}
    <section class="mapping">
      <h2>Column Mapping</h2>
      <p class="hint">Map your CSV headers to the required fields.</p>
      <table class="map-table">
        <thead>
          <tr><th>Required field</th><th>CSV column</th></tr>
        </thead>
        <tbody>
          {#each REQUIRED_COLUMNS as req}
            <tr>
              <td><code>{req}</code></td>
              <td>
                <select bind:value={mapping[req === 'date' ? 'measured_at' : req]}
                  onchange={e => { mapping = { ...mapping, [req]: e.target.value }; }}>
                  <option value="">— select —</option>
                  {#each columns as col}
                    <option value={col}>{col}</option>
                  {/each}
                </select>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    <section class="preview">
      <h2>Preview (first {preview.length} rows)</h2>
      <div class="scroll">
        <table class="data-table">
          <thead>
            <tr>{#each columns as col}<th>{col}</th>{/each}</tr>
          </thead>
          <tbody>
            {#each preview as row}
              <tr>{#each columns as col}<td>{row[col] ?? ''}</td>{/each}</tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <Button disabled={!mappingComplete || submitting} onclick={handleImport}>
      {submitting ? 'Importing…' : `Import ${rows.length} rows`}
    </Button>
  {/if}
</div>

<style>
  .import {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 900px;
  }
  h1 { margin: 0; font-size: 1.5rem; }
  h2 { margin: 0 0 0.75rem; font-size: 1.1rem; }
  .dropzone {
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 10px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  label { font-weight: 500; cursor: pointer; }
  .error { color: #dc2626; font-size: 0.875rem; margin: 0; }
  .result { background: #d1fae5; border-radius: 6px; padding: 0.75rem 1rem; font-size: 0.9rem; }
  section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1.25rem;
  }
  .hint { margin: 0 0 0.75rem; font-size: 0.875rem; color: #6b7280; }
  .map-table, .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .map-table th, .map-table td,
  .data-table th, .data-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
  }
  select {
    padding: 0.35rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
  .scroll { overflow-x: auto; }
</style>
