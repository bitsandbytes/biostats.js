<!--
  Main navigation panel: brand, route links, and the signed-in user with a
  log-out button. AppShell renders it as the persistent desktop sidebar and,
  on narrow screens, inside the slide-out drawer (passing `onclose` so the
  drawer gets a close button).
-->
<script>
  import Link from '../ui/Link.svelte';
  import Icon from '../ui/Icon.svelte';
  import { router } from '../../stores/router.svelte.js';
  import { auth, logout } from '../../stores/auth.svelte.js';

  let { onclose } = $props();

  let links = $derived([
    { to: '/', label: 'People', icon: 'people', active: router.path === '/' || router.path.startsWith('/person/') },
    { to: '/import', label: 'Import CSV', icon: 'upload', active: router.path === '/import' },
    ...(auth.session?.admin ? [{ to: '/admin', label: 'Admin', icon: 'shield', active: router.path === '/admin' }] : []),
  ]);
</script>

<nav class="sidebar" aria-label="Main">
  <div class="brand">
    <span class="mark"><Icon name="pulse" size={18} strokeWidth={2.2} /></span>
    <span class="name">bioStats</span>
    {#if onclose}
      <button class="close" aria-label="Close menu" onclick={onclose}><Icon name="close" size={22} /></button>
    {/if}
  </div>

  <ul class="links">
    {#each links as link (link.to)}
      <li>
        <Link to={link.to} class={link.active ? 'nav-link active' : 'nav-link'} aria-current={link.active ? 'page' : undefined}>
          <Icon name={link.icon} size={18} />{link.label}
        </Link>
      </li>
    {/each}
  </ul>

  <div class="account">
    <span class="avatar"><Icon name="user" size={16} /></span>
    <span class="email" title={auth.session?.email}>{auth.session?.email}</span>
    <button class="logout" aria-label="Log out" title="Log out" onclick={logout}><Icon name="logout" size={18} /></button>
  </div>
</nav>

<style>
  .sidebar {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 20px 14px;
    background: var(--nav-bg);
    color: var(--nav-ink);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 4px 24px 8px;
  }
  .mark {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: var(--nav-mark);
    color: white;
    display: grid;
    place-items: center;
  }
  .name {
    flex: 1;
    font-weight: 700;
    font-size: 1.2rem;
    color: white;
  }
  .close, .logout {
    border: 0;
    background: transparent;
    color: var(--nav-ink);
    border-radius: var(--radius-sm);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .close {
    width: 44px;
    height: 44px;
  }
  .close:hover, .logout:hover {
    background: var(--nav-active);
    color: white;
  }
  .links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .links :global(.nav-link) {
    height: 44px;
    padding: 0 12px;
    border-radius: var(--radius);
    color: var(--nav-ink);
    font-size: 0.95rem;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .links :global(.nav-link:hover) {
    background: var(--nav-active);
    color: white;
  }
  .links :global(.nav-link.active) {
    background: var(--nav-active);
    color: white;
    font-weight: 600;
  }
  .account {
    border-top: 1px solid var(--nav-rule);
    padding: 16px 4px 0 8px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--nav-active);
    display: grid;
    place-items: center;
  }
  .email {
    flex: 1;
    min-width: 0;
    font-size: 0.82rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .logout {
    width: 36px;
    height: 36px;
  }
</style>
