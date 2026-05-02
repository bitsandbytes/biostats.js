<script>
  import NavBar from './NavBar.svelte';

  let { children } = $props();
</script>

<div class="shell">
  <NavBar />
  <main class="content">
    {@render children()}
  </main>
</div>

<style>
  .shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f9fafb;
  }
  .content {
    flex: 1;
    padding: 2rem 1.5rem;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }
</style>
