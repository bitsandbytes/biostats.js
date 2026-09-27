<script>
  let { message, action } = $props();
</script>

<div class="empty-state">
  <p class="message">{message}</p>
  {#if action}
    <div class="action">{@render action()}</div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem 1rem;
    color: var(--muted);
    text-align: center;
  }
  .message {
    margin: 0;
    font-size: 1rem;
  }
</style>
