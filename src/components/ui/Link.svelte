<script>
  import { navigate } from '../../stores/router.svelte.js';

  let { to, class: className = '', children, ...rest } = $props();

  // Intercept plain left-clicks for client-side navigation; let the browser
  // handle modified clicks (ctrl/cmd/shift/middle-click) so "open in new tab" still works.
  function handleClick(e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  }
</script>

<a href={to} class={className} onclick={handleClick} {...rest}>{@render children?.()}</a>
