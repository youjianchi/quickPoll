import request from 'supertest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import app from '../src/app.js';

const mockAnonClient = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
  },
};

const mockServiceClient = {
  auth: {
    admin: {
      signOut: vi.fn(),
    },
    getUser: vi.fn(),
  },
};

vi.mock('../src/lib/supabaseClient.js', () => ({
  getAnonClient: () => mockAnonClient,
  getServiceClient: () => mockServiceClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Authentication API', () => {
  it('returns session data on successful sign in', async () => {
    const session = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: 123456,
    };

    const user = { id: 'user-id', email: 'user@example.com' };

    mockAnonClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session, user },
      error: null,
    });

    const response = await request(app)
      .post('/auth/sign-in')
      .send({ email: user.email, password: 'validpass' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: { id: user.id, email: user.email },
    });
  });

  it('rejects invalid credentials', async () => {
    mockAnonClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid email or password.' },
    });

    const response = await request(app)
      .post('/auth/sign-in')
      .send({ email: 'user@example.com', password: 'wrongpw' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password.');
  });

  it('requires refresh token when signing out', async () => {
    const response = await request(app)
      .post('/auth/sign-out')
      .send({ refreshToken: '' });

    expect(response.status).toBe(400);
  });

  it('returns authenticated user profile', async () => {
    mockServiceClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-id', email: 'user@example.com' } },
      error: null,
    });

    const response = await request(app)
      .get('/auth/session')
      .set('Authorization', 'Bearer valid-token');

    expect(mockServiceClient.auth.getUser).toHaveBeenCalledWith('valid-token');
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('user@example.com');
  });
});
