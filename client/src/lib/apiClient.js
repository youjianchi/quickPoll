const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000')
  .replace(/\/$/, '');

async function request(path, { method = 'GET', headers = {}, body, accessToken } = {}) {
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(payload?.error ?? response.statusText);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function signUp({ email, password }) {
  return request('/auth/sign-up', {
    method: 'POST',
    body: { email, password },
  });
}

export function signIn({ email, password }) {
  return request('/auth/sign-in', {
    method: 'POST',
    body: { email, password },
  });
}

export function signOut({ refreshToken, accessToken }) {
  if (!refreshToken) {
    return Promise.resolve();
  }

  return request('/auth/sign-out', {
    method: 'POST',
    body: { refreshToken },
    accessToken,
  }).catch(() => {
    // Ignore sign out errors, since tokens will be cleared client-side.
  });
}

export function fetchPoll(pollId) {
  return request(`/api/polls/${pollId}`);
}

export function createPoll({ accessToken, question, options }) {
  return request('/api/polls', {
    method: 'POST',
    body: { question, options },
    accessToken,
  });
}

export function voteOnPoll({ pollId, optionId }) {
  return request(`/api/polls/${pollId}/vote`, {
    method: 'POST',
    body: { optionId },
  });
}
