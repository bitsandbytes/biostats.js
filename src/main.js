import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

async function prepare() {
  if (import.meta.env.VITE_API_BASE_URL === 'mock') {
    const { worker } = await import('./mocks/browser.js');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

prepare().then(() => {
  mount(App, { target: document.getElementById('app') });
});