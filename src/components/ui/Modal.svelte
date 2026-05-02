<script>
  let { title, onclose, children } = $props();
</script>

<div class="modal-backdrop" onclick={onclose}>
  <div class="modal" onclick={e => e.stopPropagation()}>
    <header class="modal-header">
      <h2>{title}</h2>
      <button class="close-btn" onclick={onclose}>&times;</button>
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
    background: rgba(0, 0, 0, 0.4);
    display: grid;
    place-items: center;
    z-index: 100;
  }
  .modal {
    background: white;
    border-radius: 8px;
    min-width: 360px;
    max-width: 560px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .modal-header h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
    color: #6b7280;
  }
  .modal-body {
    padding: 1.25rem;
  }
</style>
