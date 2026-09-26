<!--
  Centered dialog over a dimmed backdrop. Closes via the × button, the Escape
  key, or a click on the backdrop itself (not on the dialog). Width is capped
  so it fits phone screens.
-->
<script>
  import Icon from './Icon.svelte';

  let { title, onclose, children } = $props();

  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;

  function onkeydown(e) {
    if (e.key === 'Escape') onclose();
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (Escape is handled on window) -->
<div class="modal-backdrop" onclick={onBackdropClick}>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <header class="modal-header">
      <h2 id={titleId}>{title}</h2>
      <button class="close-btn" aria-label="Close" onclick={onclose}><Icon name="close" size={20} /></button>
    </header>
    <div class="modal-body">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 42, 46, 0.45);
    display: grid;
    place-items: center;
    padding: 16px;
    z-index: 100;
  }
  .modal {
    background: var(--surface);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 520px;
    box-shadow: var(--shadow-overlay);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.75rem 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  .modal-header h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .close-btn {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .close-btn:hover {
    background: var(--surface-muted);
    color: var(--ink);
  }
  .modal-body {
    padding: 1.25rem;
  }
</style>
