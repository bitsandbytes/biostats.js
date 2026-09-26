<script>
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';

  let { person, onconfirm, onclose } = $props();

  let submitting = $state(false);

  async function handleConfirm() {
    submitting = true;
    try {
      await onconfirm();
    } finally {
      submitting = false;
    }
  }
</script>

<Modal title="Delete Person" {onclose}>
  <p>Are you sure you want to delete <strong>{person.name}</strong>? All measurements will be permanently removed.</p>
  <div class="actions">
    <Button variant="quiet" onclick={onclose} type="button">Cancel</Button>
    <Button variant="danger" onclick={handleConfirm} disabled={submitting}>
      {submitting ? 'Deleting…' : 'Delete'}
    </Button>
  </div>
</Modal>

<style>
  p {
    margin: 0 0 1.25rem;
    font-size: 0.95rem;
    color: var(--ink);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>
