import { API_KEY } from './config.js';

export async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return { status: res.status, ok: res.ok, body };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      body: { error: `Network error: ${err.message || String(err)}` },
    };
  }
}

export function authHeaders(extra = {}) {
  return {
    'x-api-key': API_KEY,
    ...extra,
  };
}

export function authJsonOptions(method, body) {
  const options = {
    method,
    headers: authHeaders({
      'Content-Type': 'application/json',
    }),
  };

  if (typeof body !== 'undefined') {
    options.body = JSON.stringify(body);
  }

  return options;
}