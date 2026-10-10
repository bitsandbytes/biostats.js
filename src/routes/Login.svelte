<script>
  import { login } from '../stores/auth.svelte.js'; // sets auth.session on success
  import Button from '../components/ui/Button.svelte';
  import Icon from '../components/ui/Icon.svelte';

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
      // On phones the keyboard (and any zoom) scrolled the page to the form.
      // Close the keyboard and start the app at the top.
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    } catch {
      error = 'Invalid email or password.';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="login-page">
  <form class="login-form" onsubmit={handleSubmit}>
    <div class="brand">
      <span class="mark"><Icon name="pulse" size={22} strokeWidth={2.2} /></span>
      <h1>bioStats</h1>
    </div>
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
    padding: 16px;
    display: grid;
    place-items: center;
    background: var(--bg);
  }
  .login-form {
    background: white;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 0.5rem;
  }
  .mark {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--primary);
    color: white;
    display: grid;
    place-items: center;
  }
  h1 {
    margin: 0;
    font-size: 1.6rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink);
  }
  input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .error {
    color: var(--danger);
    font-size: 0.875rem;
    margin: 0;
    text-align: center;
  }
</style>
