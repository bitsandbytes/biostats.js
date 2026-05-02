<script>
  let { variant = 'primary', type = 'button', disabled = false, onclick, children } = $props();
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="btn btn-{variant}"
>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s, opacity 0.15s;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-primary {
    background: #2563eb;
    color: white;
  }
  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .btn-secondary {
    background: #f3f4f6;
    color: #111827;
    border-color: #d1d5db;
  }
  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }
  .btn-danger {
    background: #dc2626;
    color: white;
  }
  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }
  .btn-ghost {
    background: transparent;
    color: #374151;
  }
  .btn-ghost:hover:not(:disabled) {
    background: #f3f4f6;
  }
</style>
