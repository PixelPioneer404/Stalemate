const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const request = async (path, options) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
};

export const createMatch = (name, timeControlKey) =>
  request('/create-match', {
    method: 'POST',
    body: JSON.stringify({ name, timeControlKey }),
  });

export const joinMatch = (name, matchCode) =>
  request('/join-match', {
    method: 'POST',
    body: JSON.stringify({ name, matchCode }),
  });
