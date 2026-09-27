<script>
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import { addPerson } from '../../stores/people.svelte.js'; // mutates store.people

  let { onclose } = $props();

  let name = $state('');
  let notes = $state('');
  let submitting = $state(false);
  let error = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    submitting = true;
    error = '';
    try {
      await addPerson({ name, notes: notes || undefined });
      onclose();
    } catch (err) {
      error = err?.message ?? 'Failed to add person.';
    } finally {
      submitting = false;
    }
  }
</script>

<Modal title="Add Person" {onclose}>
  <form onsubmit={handleSubmit} class="form">
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <div class="field">
      <label for="ap-name">Name</label>
      <input id="ap-name" type="text" bind:value={name} required />
    </div>
    <div class="field">
      <label for="ap-notes">Notes (optional)</label>
      <textarea id="ap-notes" bind:value={notes} rows="3"></textarea>
    </div>
    <div class="actions">
      <Button variant="quiet" onclick={onclose} type="button">Cancel</Button>
      <Button type="submit" disabled={submitting || !name}>
        {submitting ? 'Adding…' : 'Add Person'}
      </Button>
    </div>
  </form>
</Modal>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink);
  }
  input, textarea {
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .error {
    color: var(--danger);
    font-size: 0.875rem;
    margin: 0;
  }
</style>
