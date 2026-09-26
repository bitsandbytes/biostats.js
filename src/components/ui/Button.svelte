<!--
  App button. Variants: primary (teal fill), secondary (outlined teal),
  danger (coral fill), ghost (text only), quiet (neutral outline).
  `size="sm"` gives a compact 32px button for table rows. Any other
  attributes (aria-label, title, …) are passed through to the <button>.
-->
<script>
  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    onclick,
    children,
    ...rest
  } = $props();
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="btn btn-{variant} btn-{size}"
  {...rest}
>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 40px;
    padding: 0 1rem;
    border-radius: var(--radius);
    font-size: 0.9rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  }
  .btn-sm {
    height: 32px;
    padding: 0 0.65rem;
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-primary {
    background: var(--primary);
    color: white;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover);
  }
  .btn-secondary {
    background: var(--surface);
    color: var(--primary);
    border-color: var(--primary-border);
  }
  .btn-secondary:hover:not(:disabled) {
    background: var(--primary-tint);
  }
  .btn-quiet {
    background: var(--surface);
    color: var(--ink);
    border-color: var(--border);
    font-weight: 500;
  }
  .btn-quiet:hover:not(:disabled) {
    background: var(--surface-muted);
  }
  .btn-danger {
    background: var(--danger);
    color: white;
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--danger-hover);
  }
  .btn-ghost {
    background: transparent;
    color: var(--ink);
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--primary-tint);
  }
</style>
