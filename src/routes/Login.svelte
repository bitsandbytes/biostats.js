<script>
  import { login } from '../stores/auth.svelte.js'; // sets auth.session on success
  import Button from '../components/ui/Button.svelte';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    submitting = true;
    error = '';
    try {
      await login(email, password);
    } catch {
      error = 'Invalid email or password.';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="login-page">
  <form class="login-form" onsubmit={handleSubmit}>
    <h1>biostats</h1>
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <div class="field">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} required autocomplete="email" />
    </div>
    <div class="field">
      <label for="password">Password</label>
      <input id="password" type="password" bind:value={password} required autocomplete="current-password" />
    </div>
    <Button type="submit" disabled={submitting}>
      {submitting ? 'Signing in…' : 'Sign in'}
    </Button>
  </form>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #f9fafb;
  }
  .login-form {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 2rem;
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
    text-align: center;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #374151;
  }
  input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .error {
    color: #dc2626;
    font-size: 0.875rem;
    margin: 0;
    text-align: center;
  }
</style>
