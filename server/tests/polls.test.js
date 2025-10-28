import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import {
  createPollWithOptions,
  fetchPollById,
  voteOnOption,
} from '../src/lib/polls.js';

const mockServiceClient = {
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('../src/lib/supabaseClient.js', () => ({
  getAnonClient: vi.fn(),
  getServiceClient: () => mockServiceClient,
}));

vi.mock('../src/lib/polls.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Polls API', () => {
  it('blocks poll creation when not authenticated', async () => {
    const response = await request(app)
      .post('/api/polls')
      .send({ question: 'Lunch?', options: ['A', 'B'] });

    expect(response.status).toBe(401);
  });

  it('creates poll for authenticated users', async () => {
    mockServiceClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-id', email: 'user@example.com' } },
      error: null,
    });

    const poll = {
      id: 42,
      question: 'Best snack?',
      created_at: '2024-10-01T00:00:00Z',
      options: [],
    };

    createPollWithOptions.mockResolvedValueOnce(poll);

    const response = await request(app)
      .post('/api/polls')
      .set('Authorization', 'Bearer token')
      .send({ question: 'Best snack?', options: ['Chips', 'Fruit'] });

    expect(response.status).toBe(201);
    expect(createPollWithOptions).toHaveBeenCalledWith({
      question: 'Best snack?',
      options: ['Chips', 'Fruit'],
      userId: 'user-id',
    });
    expect(response.body.poll.id).toBe(42);
  });

  it('fetches a poll by id', async () => {
    const poll = {
      id: 10,
      question: 'Coffee or tea?',
      created_at: '2024-01-01T00:00:00Z',
      options: [],
    };

    fetchPollById.mockResolvedValueOnce(poll);

    const response = await request(app).get('/api/polls/10');

    expect(fetchPollById).toHaveBeenCalledWith(10);
    expect(response.status).toBe(200);
    expect(response.body.poll.question).toBe('Coffee or tea?');
  });

  it('allows anonymous voting', async () => {
    fetchPollById.mockResolvedValueOnce({
      id: 10,
      options: [],
    });
    voteOnOption.mockResolvedValueOnce(true);
    fetchPollById.mockResolvedValueOnce({
      id: 10,
      question: 'Coffee or tea?',
      options: [],
    });

    const response = await request(app)
      .post('/api/polls/10/vote')
      .send({ optionId: 2 });

    expect(voteOnOption).toHaveBeenCalledWith(10, 2);
    expect(response.status).toBe(200);
  });
});
