<script>
  let { value = $bindable(''), suggestions = [], placeholder = '', id } = $props();

  let open = $state(false);
  let filtered = $derived(
    value
      ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
      : suggestions
  );

  function select(s) {
    value = s;
    open = false;
  }

  function onblur() {
    // Delay so click on suggestion registers first
    setTimeout(() => { open = false; }, 150);
  }
</script>

<div class="autocomplete">
  <input
    {id}
    type="text"
    bind:value
    {placeholder}
    autocomplete="off"
    onfocus={() => { open = true; }}
    onblur={onblur}
    oninput={() => { open = true; }}
  />
  {#if open && filtered.length > 0}
    <ul class="suggestions">
      {#each filtered as s}
        <li onmousedown={() => select(s)}>{s}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .autocomplete {
    position: relative;
  }
  input {
    width: 100%;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
    box-sizing: border-box;
  }
  .suggestions {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--border);
    border-radius: 6px;
    margin: 0;
    padding: 0.25rem 0;
    list-style: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
  }
  li {
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  li:hover {
    background: var(--surface-muted);
  }
</style>
