<!--
  Inline stroke icon (24×24 grid, drawn with currentColor so it inherits the
  surrounding text colour). Add new icons to PATHS as SVG path/shape markup.
  Decorative by default; pass `label` to expose it to screen readers.
-->
<script>
  let { name, size = 20, strokeWidth = 2, label } = $props();

  const PATHS = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    people: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    'chevron-left': '<path d="M15 18l-6-6 6-6"/>',
    'chevron-right': '<path d="M9 18l6-6-6-6"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>',
    ruler: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    scale: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.9 1.5L2 20h20l-2.6-10.5A2 2 0 0 0 17.5 8Z"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
    thermometer: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  class="icon"
>{@html PATHS[name] ?? ''}</svg>

<style>
  .icon {
    flex-shrink: 0;
    display: block;
  }
</style>
