<script>
  const message = "Hello, world!";
</script>

<main class="app">
  <h1>{message}</h1>
  <p>Your first Svelte app is running.</p>
</main>

<style>
  .app {
    min-height: 100vh;
    display: grid;
    place-items: center;
    font-family: system-ui, sans-serif;
    text-align: center;
  }

  h1 {
    font-size: 3rem;
    margin: 0;
  }

  p {
    color: #555;
    margin-top: 0.75rem;
  }
</style>