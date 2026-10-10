/**
 * Interprets `VITE_API_BASE_URL`, the backend origin that every API call is
 * prefixed with.
 *
 * The value is compiled into the bundle by Vite at build time. The production
 * site is a static-assets-only Cloudflare Worker, which has no runtime config,
 * so the value has to be set as a build variable there. Accepted values:
 *
 * - empty or unset: same-origin `/api/*`. In dev, the Vite proxy forwards these
 *   to the backend.
 * - `mock`: same-origin `/api/*`, intercepted in the browser by MSW.
 * - an absolute `http(s)://` URL such as `https://api.example.com`: calls go
 *   straight to that origin, which then needs CORS with credentials (see
 *   API_CONTRACT.md).
 *
 * This module is imported by `api.js` and `main.js` in the browser, and by
 * `vite.config.js` to check the value at build time, so a bad value fails the
 * build instead of shipping a broken deploy.
 */

/** True when the app should start MSW instead of talking to a backend. */
export function isMockMode(raw) {
  return (raw ?? '').trim() === 'mock';
}

/**
 * Normalizes a raw `VITE_API_BASE_URL` into the prefix used by `request()`.
 * Strips trailing slashes, so `https://api.example.com/` doesn't produce
 * `//api/...` paths.
 *
 * @param {string | undefined} raw
 * @returns {string} '' for same-origin, otherwise an absolute URL with no trailing slash
 * @throws {Error} if the value is set but isn't an absolute http(s) URL
 */
export function resolveApiBase(raw) {
  const value = (raw ?? '').trim();
  if (value === '' || isMockMode(value)) return '';

  let url;
  try {
    url = new URL(value);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    throw new Error(
      `VITE_API_BASE_URL must be empty, "mock", or an absolute http(s) URL ` +
      `(e.g. https://api.example.com); got "${value}".`,
    );
  }
  return value.replace(/\/+$/, '');
}
