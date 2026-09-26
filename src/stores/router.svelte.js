import { matchPath } from '../lib/router.js';

function currentPath() {
  return typeof window !== 'undefined' ? window.location.pathname : '/';
}

/** Reactive current path (`router.path`), kept in sync with the History API. */
export const router = $state({ path: currentPath() });

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    router.path = currentPath();
  });
}

/**
 * Navigates to `to`, pushing (or replacing) a History entry and updating
 * `router.path` so App.svelte re-renders the matching route.
 */
export function navigate(to, { replace = false } = {}) {
  if (typeof window === 'undefined') return;
  if (replace) {
    window.history.replaceState({}, '', to);
  } else {
    window.history.pushState({}, '', to);
  }
  router.path = currentPath();
}

export { matchPath };
