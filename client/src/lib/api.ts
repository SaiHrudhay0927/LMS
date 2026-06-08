import axios from 'axios';

const TOKEN_KEY = 'pulse-lms-token';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((cfg) => {
  const tok = localStorage.getItem(TOKEN_KEY);
  if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  return cfg;
});

export function setToken(tok: string | null) {
  if (tok) localStorage.setItem(TOKEN_KEY, tok);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
