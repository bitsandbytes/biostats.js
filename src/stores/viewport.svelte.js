import { MediaQuery } from 'svelte/reactivity';

/**
 * Reactive layout breakpoint. `desktop.current` is true at ≥1024px wide,
 * where the app shows the persistent sidebar and desktop page layouts;
 * narrower screens get the top bar + slide-out drawer and stacked layouts.
 * Keep in sync with the `@media (min-width: 1024px)` rules in components.
 */
export const desktop = new MediaQuery('min-width: 1024px');
