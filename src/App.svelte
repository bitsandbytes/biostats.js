<script>
  import { onMount } from 'svelte';
  import { Router, Route } from 'svelte-routing';
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
</script>

{#if !ready}
  <!-- Waiting for session check -->
{:else if auth.session}
  <Router>
    <AppShell>
      <Route path="/" component={Dashboard} />
      <Route path="/person/:id" component={PersonDetail} let:params>
        <PersonDetail id={params.id} />
      </Route>
      <Route path="/import" component={Import} />
      <Route path="/admin" component={Admin} />
    </AppShell>
  </Router>
{:else}
  <Login />
{/if}
