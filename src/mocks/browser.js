/**
 * Starts MSW in the browser (mock mode only, see main.js).
 *
 * Also exposes `window.mockAuth` for checking the token refresh path by hand
 * from the DevTools console:
 *   mockAuth.expireAccessTokens() — the next request gets a 401, refreshes, and retries
 *   mockAuth.revokeAll()          — the next refresh is refused and the app returns to login
 */
import { setupWorker } from 'msw/browser';
import { handlers, sessions } from './handlers.js';

export const worker = setupWorker(...handlers);

window.mockAuth = {
  expireAccessTokens: () => sessions.expireAccessTokens(),
  revokeAll: () => sessions.revokeAll(),
};
