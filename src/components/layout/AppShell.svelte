<!--
  Signed-in page frame. Desktop (≥1024px): persistent Sidebar on the left,
  page content on the right. Narrow screens: a top bar with a hamburger
  button that opens the Sidebar as a slide-out drawer over the page. The
  drawer closes on navigation, on Escape, and when the backdrop is tapped.
-->
<script>
  import Sidebar from './Sidebar.svelte';
  import Icon from '../ui/Icon.svelte';
  import Link from '../ui/Link.svelte';
  import { desktop } from '../../stores/viewport.svelte.js';
  import { router } from '../../stores/router.svelte.js';

  let { children } = $props();

  let drawerOpen = $state(false);

  // Any route change (including links inside the drawer) closes the drawer.
  $effect(() => {
    router.path;
    drawerOpen = false;
  });

  function onkeydown(e) {
    if (e.key === 'Escape' && drawerOpen) drawerOpen = false;
  }
</script>

<svelte:window {onkeydown} />

{#if desktop.current}
  <div class="shell desktop">
    <aside class="sidebar-slot"><Sidebar /></aside>
    <main class="content">{@render children()}</main>
  </div>
{:else}
  <div class="shell mobile">
    <header class="topbar">
      <button class="menu-btn" aria-label="Open menu" aria-expanded={drawerOpen} onclick={() => { drawerOpen = true; }}>
        <Icon name="menu" size={24} />
      </button>
      <Link to="/" class="topbar-brand">
        <span class="mark"><Icon name="pulse" size={18} strokeWidth={2.2} /></span>bioStats
      </Link>
    </header>

    {#if drawerOpen}
      <div class="drawer-layer">
        <aside class="drawer"><Sidebar onclose={() => { drawerOpen = false; }} /></aside>
        <button class="backdrop" aria-label="Close menu" onclick={() => { drawerOpen = false; }}></button>
      </div>
    {/if}

    <main class="content">{@render children()}</main>
  </div>
{/if}

<style>
  .shell {
    min-height: 100vh;
  }
  .desktop {
    display: flex;
  }
  .sidebar-slot {
    width: 232px;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
  }
  .content {
    flex: 1;
    min-width: 0;
    padding: 16px;
  }
  .desktop .content {
    padding: 28px 32px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 60px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .menu-btn {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: var(--radius);
    background: transparent;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .menu-btn:hover {
    background: var(--primary-tint);
  }
  .topbar :global(.topbar-brand) {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--ink);
    text-decoration: none;
  }
  .mark {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--primary);
    color: white;
    display: grid;
    place-items: center;
  }

  .drawer-layer {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
  }
  .drawer {
    width: min(300px, 85vw);
    height: 100%;
    box-shadow: var(--shadow-overlay);
    animation: slide-in 0.18s ease-out;
  }
  .backdrop {
    flex: 1;
    border: 0;
    background: rgba(15, 42, 46, 0.45);
    cursor: pointer;
  }
  @keyframes slide-in {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .drawer { animation: none; }
  }
</style>
