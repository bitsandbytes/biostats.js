import * as api from '../lib/api.js';

export const auth = $state({ session: null }); // session: null | { id, email, admin }

export async function initSession() {
  try {
    auth.session = await api.getMe();
  } catch {
    auth.session = null;
  }
}

export async function login(email, password) {
  const { user } = await api.login({ email, password });
  auth.session = user;
}

export async function logout() {
  await api.logout();
  auth.session = null;
}
