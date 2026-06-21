<script>
  import { Link } from 'svelte-routing';
  import { logout, auth } from '../../stores/auth.svelte.js';
  import Button from '../ui/Button.svelte';
</script>

<nav class="navbar">
  <div class="brand">
    <Link to="/">biostats</Link>
  </div>
  <div class="links">
    <Link to="/">Dashboard</Link>
    <Link to="/import">Import</Link>
    {#if auth.session?.admin}<Link to="/admin">Admin</Link>{/if}
  </div>
  <div class="user">
    <span>{auth.session?.email}</span>
    <Button variant="ghost" onclick={logout}>Log out</Button>
  </div>
</nav>

<style>
  .navbar {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0 1.5rem;
    height: 56px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }
  .brand {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .links {
    display: flex;
    gap: 1rem;
    flex: 1;
  }
  .user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: #6b7280;
  }
</style>
