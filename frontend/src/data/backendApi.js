/**
 * Llamadas al backend (cuando VITE_API_URL está definido).
 * dataClient = { _backend: true, apiBase, token }
 */
export async function backendRequest(client, path, options = {}) {
  const { apiBase, token } = client;
  const url = `${apiBase}${path}`;
  let body = options.body;
  if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }
  const hasJsonBody = body != null && (typeof body === 'string' || body instanceof FormData);
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(hasJsonBody && typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
  };
  const res = await fetch(url, {
    ...options,
    method: options.method || 'GET',
    headers,
    ...(body != null ? { body } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || 'Error');
  }
  if (res.status === 204) return null;
  return res.json();
}
