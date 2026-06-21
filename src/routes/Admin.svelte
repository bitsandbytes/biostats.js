<script>
  import { onMount } from 'svelte';
  import * as api from '../lib/api.js';
  import Button from '../components/ui/Button.svelte';
  import EmptyState from '../components/ui/EmptyState.svelte';

  let users = $state([]);
  let email = $state('');
  let password = $state('');
  let adminFlag = $state(false);
  let submitting = $state(false);
  let error = $state('');
  let forbidden = $state(false);

  onMount(async () => {
    try {
      users = await api.getUsers();
    } catch (err) {
      if (err?.status === 403 || err?.error === 'Forbidden') forbidden = true;
    }
  });

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
        <table class="table">
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
        </table>
      {/if}
    </section>
  {/if}
</div>

<style>
  .admin { display: flex; flex-direction: column; gap: 1.5rem; max-width: 700px; }
  h1 { margin: 0; font-size: 1.5rem; }
  h2 { margin: 0 0 0.75rem; font-size: 1.1rem; }
  section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1.25rem;
  }
  .form { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 150px; }
  label { font-size: 0.85rem; font-weight: 500; color: #374151; }
  input {
    padding: 0.45rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .error { color: #dc2626; font-size: 0.875rem; margin: 0 0 0.5rem; }
  .forbidden { color: #6b7280; font-size: 0.95rem; }
  .checkbox-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; white-space: nowrap; }
  .table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { font-weight: 600; color: #374151; }
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
</style>
