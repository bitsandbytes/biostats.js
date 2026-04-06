# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite HMR)
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture

This is a Svelte 5 + Vite app. The entry point is `index.html`, which loads `src/main.js`, which mounts `src/App.svelte` into `#app`. There are no tests configured yet.
