<!--
  Login screen, shown by App.svelte while there's no session.

  The fields are set up so the browser and phone do as much of the typing as
  possible (see the ui-input-conveniences skill):
  - `autocomplete="username"` / `"current-password"` in one real <form>, so
    password managers and browser autofill offer saved logins.
  - The email field brings up the phone's email keyboard, with autocapitalise
    and autocorrect off, and suggests common domains (name@gmail.com, …) from
    a <datalist> once "@" is typed.
  - The keyboard's return key says "Next" on email (and moves to the password)
    and "Go" on the password (and submits).
  - The password has a show/hide toggle.
  - On desktop the email field gets focus on load. On phones it doesn't,
    because that would pop up the keyboard over the page.
  Passkeys aren't offered yet: the backend has no WebAuthn endpoints.
-->
<script>
  import { onMount } from 'svelte';
  import { login } from '../stores/auth.svelte.js'; // sets auth.session on success
  import { errorMessage } from '../lib/api.js';
  import { emailSuggestions } from '../lib/emailSuggest.js';
  import { desktop } from '../stores/viewport.svelte.js';
  import Button from '../components/ui/Button.svelte';
  import Icon from '../components/ui/Icon.svelte';

  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let error = $state('');
  let submitting = $state(false);
  let emailInput;
  let passwordInput;

  const suggestions = $derived(emailSuggestions(email));

  onMount(() => {
    if (desktop.current) emailInput.focus();
  });

  // Enter (the "Next" key on phones) in the email field moves to the password
  // instead of submitting a half-filled form. If the password is already filled
  // in, for example by autofill, Enter submits as usual.
  function handleEmailKeydown(e) {
    if (e.key === 'Enter' && !password) {
      e.preventDefault();
      passwordInput.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    submitting = true;
    error = '';
    try {
      await login(email.trim(), password);
      // On phones the keyboard (and any zoom) scrolled the page to the form.
      // Close the keyboard and start the app at the top.
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    } catch (err) {
      // 401 is a wrong email or password. Anything else (server down, no
      // network) gets its own message, so the user doesn't retype a correct password.
      error = err?.status === 401
        ? 'Invalid email or password.'
        : errorMessage(err, 'Sign-in failed. Please try again.');
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
      <p class="error" role="alert">{error}</p>
    {/if}
    <div class="field">
      <label for="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        bind:this={emailInput}
        bind:value={email}
        onkeydown={handleEmailKeydown}
        required
        autocomplete="username"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
        enterkeyhint="next"
        list="email-domains"
      />
      <datalist id="email-domains">
        {#each suggestions as s (s)}
          <option value={s}></option>
        {/each}
      </datalist>
    </div>
    <div class="field">
      <label for="password">Password</label>
      <div class="password-wrap">
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          bind:this={passwordInput}
          bind:value={password}
          required
          autocomplete="current-password"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="go"
        />
        <button
          type="button"
          class="reveal"
          onclick={() => (showPassword = !showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
        >
          <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
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
    width: 100%;
    min-height: 44px; /* comfortable touch target on phones */
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .password-wrap {
    position: relative;
  }
  .password-wrap input {
    padding-right: 48px; /* room for the show/hide button */
  }
  .reveal {
    position: absolute;
    top: 0;
    right: 0;
    width: 44px;
    height: 100%;
    display: grid;
    place-items: center;
    border: none;
    background: none;
    color: var(--muted);
    cursor: pointer;
  }
  .error {
    color: var(--danger);
    font-size: 0.875rem;
    margin: 0;
    text-align: center;
  }
</style>
