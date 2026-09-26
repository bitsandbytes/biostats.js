<script>
  import { onMount } from 'svelte';
  import * as api from '../lib/api.js';
  import Button from '../components/ui/Button.svelte';
  import EmptyState from '../components/ui/EmptyState.svelte';
  import {
    store as measurementTypesStore,
    loadTypes,
    createType,
    renameType,
    removeType,
    addUnit,
    renameUnit,
    removeUnit,
  } from '../stores/measurementTypes.svelte.js';

  let users = $state([]);
  let email = $state('');
  let password = $state('');
  let adminFlag = $state(false);
  let submitting = $state(false);
  let error = $state('');
  let forbidden = $state(false);

  let newTypeLabel = $state('');
  let typeError = $state('');
  let newUnitDrafts = $state({}); // typeId -> { label, abbreviation }
  let unitError = $state({}); // typeId -> string
  let editingTypeId = $state(null);
  let editTypeLabel = $state('');
  let editingUnitId = $state(null);
  let editUnitLabel = $state('');
  let editUnitAbbr = $state('');

  onMount(async () => {
    try {
      users = await api.getUsers();
    } catch (err) {
      if (err?.status === 403 || err?.error === 'Forbidden') forbidden = true;
    }
    try {
      await loadTypes();
    } catch (err) {
      // measurement types section will just show empty; users list already reports 403
    }
  });

  function draftFor(typeId) {
    return newUnitDrafts[typeId] ?? { label: '', abbreviation: '' };
  }

  async function handleAddType(e) {
    e.preventDefault();
    typeError = '';
    try {
      await createType(newTypeLabel);
      newTypeLabel = '';
    } catch (err) {
      typeError = err?.message ?? 'Failed to create type.';
    }
  }

  async function handleDeleteType(id) {
    await removeType(id);
  }

  function startEditType(type) {
    editingTypeId = type.id;
    editTypeLabel = type.label;
  }

  function cancelEditType() {
    editingTypeId = null;
    editTypeLabel = '';
  }

  async function saveEditType(id) {
    await renameType(id, editTypeLabel);
    cancelEditType();
  }

  async function handleAddUnit(e, typeId) {
    e.preventDefault();
    unitError = { ...unitError, [typeId]: '' };
    const draft = draftFor(typeId);
    try {
      await addUnit(typeId, { label: draft.label, abbreviation: draft.abbreviation });
      newUnitDrafts = { ...newUnitDrafts, [typeId]: { label: '', abbreviation: '' } };
    } catch (err) {
      unitError = { ...unitError, [typeId]: err?.message ?? 'Failed to add unit.' };
    }
  }

  async function handleDeleteUnit(typeId, unitId) {
    await removeUnit(typeId, unitId);
  }

  function startEditUnit(unit) {
    editingUnitId = unit.id;
    editUnitLabel = unit.label;
    editUnitAbbr = unit.abbreviation;
  }

  function cancelEditUnit() {
    editingUnitId = null;
    editUnitLabel = '';
    editUnitAbbr = '';
  }

  async function saveEditUnit(typeId, unitId) {
    await renameUnit(typeId, unitId, { label: editUnitLabel, abbreviation: editUnitAbbr });
    cancelEditUnit();
  }

  async function handleAddUser(e) {
    e.preventDefault();
    submitting = true;
    error = '';
    try {
      const u = await api.createUser({ email, password, admin: adminFlag });
      users.push(u);
      email = '';
      password = '';
      adminFlag = false;
    } catch (err) {
      error = err?.message ?? 'Failed to create user.';
    } finally {
      submitting = false;
    }
  }

  async function handleDeleteUser(id) {
    await api.deleteUser(id);
    users = users.filter(u => u.id !== id);
  }
</script>

<div class="admin">
  <h1>Admin — Users</h1>

  {#if forbidden}
    <p class="forbidden">You don't have permission to access this page.</p>
  {:else}
    <section class="add-user">
      <h2>Add User</h2>
      {#if error}<p class="error">{error}</p>{/if}
      <form onsubmit={handleAddUser} class="form">
        <div class="field">
          <label for="new-email">Email</label>
          <input id="new-email" type="email" bind:value={email} required />
        </div>
        <div class="field">
          <label for="new-pass">Password</label>
          <input id="new-pass" type="password" bind:value={password} required />
        </div>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={adminFlag} />
          Admin
        </label>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add User'}
        </Button>
      </form>
    </section>

    <section>
      <h2>Users</h2>
      {#if users.length === 0}
        <EmptyState message="No users yet." />
      {:else}
        <div class="scroll"><table class="table">
          <thead>
            <tr><th>Email</th><th>Role</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {#each users as u (u.id)}
              <tr>
                <td>{u.email}</td>
                <td>{#if u.admin}<span class="badge">Admin</span>{/if}</td>
                <td>{u.created_at ?? ''}</td>
                <td><Button variant="ghost" onclick={() => handleDeleteUser(u.id)}>Delete</Button></td>
              </tr>
            {/each}
          </tbody>
        </table></div>
      {/if}
    </section>

    <section class="measurement-types">
      <h2>Measurement Types</h2>
      {#if typeError}<p class="error">{typeError}</p>{/if}
      <form onsubmit={handleAddType} class="form">
        <div class="field">
          <label for="new-type-label">New type label</label>
          <input id="new-type-label" bind:value={newTypeLabel} placeholder="e.g. height" required />
        </div>
        <Button type="submit">Add Type</Button>
      </form>

      {#if measurementTypesStore.types.length === 0}
        <EmptyState message="No measurement types yet." />
      {:else}
        <div class="type-list">
          {#each measurementTypesStore.types as type (type.id)}
            <div class="type-group">
              <div class="type-header">
                {#if editingTypeId === type.id}
                  <input bind:value={editTypeLabel} />
                  <Button onclick={() => saveEditType(type.id)}>Save</Button>
                  <Button variant="ghost" onclick={cancelEditType}>Cancel</Button>
                {:else}
                  <h3>{type.label}</h3>
                  <Button variant="ghost" onclick={() => startEditType(type)}>Rename</Button>
                  <Button variant="ghost" onclick={() => handleDeleteType(type.id)}>Delete</Button>
                {/if}
              </div>

              {#if type.units.length === 0}
                <p class="no-units">No units yet.</p>
              {:else}
                <ul class="unit-list">
                  {#each type.units as unit (unit.id)}
                    <li>
                      {#if editingUnitId === unit.id}
                        <input bind:value={editUnitLabel} placeholder="Label" />
                        <input bind:value={editUnitAbbr} placeholder="Abbreviation" class="abbr-input" />
                        <Button onclick={() => saveEditUnit(type.id, unit.id)}>Save</Button>
                        <Button variant="ghost" onclick={cancelEditUnit}>Cancel</Button>
                      {:else}
                        <span>{unit.label} ({unit.abbreviation})</span>
                        <Button variant="ghost" onclick={() => startEditUnit(unit)}>Edit</Button>
                        <Button variant="ghost" onclick={() => handleDeleteUnit(type.id, unit.id)}>Delete</Button>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}

              {#if unitError[type.id]}<p class="error">{unitError[type.id]}</p>{/if}
              <form onsubmit={(e) => handleAddUnit(e, type.id)} class="form add-unit-form">
                <input
                  placeholder="Unit label (e.g. Centimeters)"
                  value={draftFor(type.id).label}
                  oninput={(e) => newUnitDrafts = { ...newUnitDrafts, [type.id]: { ...draftFor(type.id), label: e.target.value } }}
                  required
                />
                <input
                  placeholder="Abbreviation (e.g. cm)"
                  class="abbr-input"
                  value={draftFor(type.id).abbreviation}
                  oninput={(e) => newUnitDrafts = { ...newUnitDrafts, [type.id]: { ...draftFor(type.id), abbreviation: e.target.value } }}
                  required
                />
                <Button type="submit" variant="ghost">Add Unit</Button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .admin { display: flex; flex-direction: column; gap: 1.5rem; max-width: 700px; }
  h1 { margin: 0; font-size: 1.5rem; }
  h2 { margin: 0 0 0.75rem; font-size: 1.1rem; }
  section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }
  .form { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 150px; }
  label { font-size: 0.85rem; font-weight: 500; color: var(--ink); }
  input {
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .error { color: var(--danger); font-size: 0.875rem; margin: 0 0 0.5rem; }
  .forbidden { color: var(--muted); font-size: 0.95rem; }
  .checkbox-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; white-space: nowrap; }
  .scroll { overflow-x: auto; }
  .table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); text-align: left; }
  th { font-weight: 600; color: var(--ink); }
  td:last-child { text-align: right; }
  .badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: #ede9fe;
    color: #6d28d9;
  }
  .type-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
  .type-group { border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
  .type-header { display: flex; align-items: center; gap: 0.5rem; }
  .type-header h3 { margin: 0; font-size: 1rem; flex: 1; }
  .type-header input { flex: 1; }
  .unit-list { list-style: none; margin: 0.75rem 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .unit-list li { display: flex; align-items: center; gap: 0.5rem; }
  .unit-list li span { flex: 1; font-size: 0.9rem; }
  .no-units { color: var(--faint); font-size: 0.85rem; margin: 0.5rem 0; }
  .abbr-input { max-width: 120px; }
  .add-unit-form { margin-top: 0.5rem; }
</style>
