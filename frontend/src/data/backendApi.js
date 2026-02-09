/**
 * Llamadas al backend (cuando VITE_API_URL está definido).
 * dataClient = { _backend: true, apiBase, token }
 */
export async function backendRequest(client, path, options = {}) {
  const { apiBase, token } = client;
  const url = `${apiBase}${path}`;
  const isJsonBody = options.body != null && (typeof options.body === 'string' || (typeof options.body === 'object' && !(options.body instanceof FormData)));
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || 'Error');
  }
  if (res.status === 204) return null;
  return res.json();
}
