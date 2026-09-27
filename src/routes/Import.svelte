<!--
  CSV bulk import: pick a file, map its headers to the import fields, preview,
  then POST /api/import. After an import, rows the backend rejected are listed
  with their original CSV values and the reason(s) each one failed.
-->
<script>
  import Button from '../components/ui/Button.svelte';
  import * as api from '../lib/api.js';
  import { parseCsv, applyMapping, guessMapping, IMPORT_FIELDS } from '../lib/csv.js';
  import { groupRowErrors } from '../lib/importReport.js';
  import { loadTypes } from '../stores/measurementTypes.svelte.js';

  let columns = $state([]);
  let rows = $state([]);
  // { <canonical field key>: <chosen CSV header> } — same shape guessMapping returns
  // and applyMapping consumes. The date field's key is `measured_at`, not `date`.
  let mapping = $state({});
  let result = $state(null);
  // Rows the backend rejected, grouped per row (see groupRowErrors). Built at
  // import time so later changes to the mapping don't alter what's shown.
  let failedRows = $state([]);
  let error = $state('');
  let submitting = $state(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    error = '';
    result = null;
    failedRows = [];
    try {
      const parsed = await parseCsv(file);
      columns = parsed.columns;
      rows = parsed.rows;
      // Auto-map headers to fields (case-insensitive, alias-aware)
      mapping = guessMapping(columns);
    } catch {
      error = 'Failed to parse CSV.';
    }
  }

  let preview = $derived(rows.slice(0, 10));
  let mappingComplete = $derived(IMPORT_FIELDS.every(f => mapping[f.key]));

  async function handleImport() {
    submitting = true;
    error = '';
    try {
      const mapped = applyMapping(rows, mapping);
      result = await api.importData({ rows: mapped });
      failedRows = groupRowErrors(result.rowErrors, rows, mapping);
      // The Import button sits below the mapping + preview, but the result
      // banner and failed-rows table render at the top — bring them into view.
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (result.createdTypes?.length || result.createdUnits?.length) {
        await loadTypes();
      }
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

  {#if result}
    <div class="result" class:has-errors={result.errors > 0}>
      <p>Import complete: {result.created} created, {result.skipped} skipped, {result.errors} errors.</p>
      {#if result.createdTypes?.length}
        <p class="note">
          New measurement type{result.createdTypes.length > 1 ? 's' : ''} created:
          {result.createdTypes.map(t => t.label).join(', ')}
        </p>
      {/if}
      {#if result.createdUnits?.length}
        <p class="note">
          New unit{result.createdUnits.length > 1 ? 's' : ''} created:
          {result.createdUnits.map(u => `${u.label} (${u.abbreviation}) under ${u.typeLabel}`).join(', ')}
        </p>
      {/if}
    </div>
  {/if}

  {#if failedRows.length}
    <section class="failed">
      <h2>{failedRows.length} row{failedRows.length > 1 ? 's' : ''} not imported</h2>
      <p class="hint">Row numbers count data rows in your file, not including the header. Fix these rows and re-import just them.</p>
      <div class="scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Row</th>
              {#each IMPORT_FIELDS as field}<th>{field.label}</th>{/each}
              <th>Problem</th>
            </tr>
          </thead>
          <tbody>
            {#each failedRows as row (row.rowNumber)}
              {@const badFields = new Set(row.problems.map(p => p.field))}
              <tr>
                <td>{row.rowNumber}</td>
                {#each IMPORT_FIELDS as field}
                  <td class:bad={badFields.has(field.key)}>{row.values[field.key] ?? ''}</td>
                {/each}
                <td class="problems">
                  {#each row.problems as problem}<div>{problem.message}</div>{/each}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
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
          {#each IMPORT_FIELDS as field}
            <tr>
              <td><code>{field.label}</code></td>
              <td>
                <select bind:value={mapping[field.key]}>
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

    {#if error}
      <p class="error">{error}</p>
    {/if}

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
    border: 2px dashed var(--border);
    border-radius: 10px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  label { font-weight: 500; cursor: pointer; }
  .error { color: var(--danger); font-size: 0.875rem; margin: 0; }
  .result {
    background: var(--primary-tint);
    border-radius: var(--radius-sm);
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  .result.has-errors { background: var(--vital-tint); }
  .result p { margin: 0; }
  .result .note { margin-top: 0.5rem; color: var(--primary-hover); }
  .failed td.bad {
    background: var(--vital-tint);
    color: var(--danger);
    font-weight: 600;
  }
  .failed td.problems { color: var(--danger); min-width: 14rem; }
  section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }
  .hint { margin: 0 0 0.75rem; font-size: 0.875rem; color: var(--muted); }
  .map-table, .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .map-table th, .map-table td,
  .data-table th, .data-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  select {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  .scroll { overflow-x: auto; }
</style>
