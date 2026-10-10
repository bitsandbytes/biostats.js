import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { isMockMode } from './lib/apiBase.js';

async function prepare() {
  if (isMockMode(import.meta.env.VITE_API_BASE_URL)) {
    const { worker } = await import('./mocks/browser.js');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

prepare().then(() => {
  mount(App, { target: document.getElementById('app') });
});