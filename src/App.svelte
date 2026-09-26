<script>
  import { onMount } from 'svelte';
  import { router, matchPath } from './stores/router.svelte.js';
  import { auth, initSession } from './stores/auth.svelte.js';
  import AppShell from './components/layout/AppShell.svelte';
  import Login from './routes/Login.svelte';
  import Dashboard from './routes/Dashboard.svelte';
  import PersonDetail from './routes/PersonDetail.svelte';
  import Import from './routes/Import.svelte';
  import Admin from './routes/Admin.svelte';

  let ready = $state(false);

  onMount(async () => {
    await initSession();
    ready = true;
  });

  let personParams = $derived(matchPath('/person/:id', router.path));
</script>

{#if !ready}
  <!-- Waiting for session check -->
{:else if auth.session}
  <AppShell>
    {#if router.path === '/'}
      <Dashboard />
    {:else if personParams}
      <PersonDetail id={personParams.id} />
    {:else if router.path === '/import'}
      <Import />
    {:else if router.path === '/admin' && auth.session?.admin}
      <Admin />
    {/if}
  </AppShell>
{:else}
  <Login />
{/if}
