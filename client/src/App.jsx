import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import StatusMessage from './components/StatusMessage';
import PollDetails from './components/PollDetails';
import {
  signIn,
  signUp,
  signOut,
  createPoll,
  fetchPoll,
  voteOnPoll,
} from './lib/apiClient.js';

const REFRESH_INTERVAL = 2000;
const INITIAL_OPTIONS = ['', ''];
const SESSION_STORAGE_KEY = 'quickpoll_session';

function loadSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to parse stored session', error);
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [authMode, setAuthMode] = useState('sign-in');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [authStatus, setAuthStatus] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [createStatus, setCreateStatus] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const [pollIdInput, setPollIdInput] = useState('');
  const [activePoll, setActivePoll] = useState(null);
  const [pollStatus, setPollStatus] = useState(null);
  const [isLoadingPoll, setIsLoadingPoll] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const refreshTimerRef = useRef(null);

  const isAuthenticated = Boolean(session?.accessToken);

  const trimmedOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    setAuthStatus(null);
  }, [authMode]);

  const stopPolling = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (pollId) => {
      stopPolling();

      refreshTimerRef.current = setInterval(async () => {
        try {
          const { poll } = await fetchPoll(pollId);
          if (poll) {
            setActivePoll(poll);
          }
        } catch (error) {
          console.error('Failed to refresh poll:', error);
        }
      }, REFRESH_INTERVAL);
    },
    [stopPolling]
  );

  useEffect(() => stopPolling, [stopPolling]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthStatus(null);
    setIsAuthenticating(true);

    try {
      if (authMode === 'sign-up') {
        await signUp(credentials);
        setAuthStatus({
          type: 'success',
          message: 'Account created. Check your inbox to confirm your email.',
        });
        setAuthMode('sign-in');
      } else {
        const authResult = await signIn(credentials);
        setSession(authResult);
        setAuthStatus({
          type: 'success',
          message: 'Signed in successfully.',
        });
      }
      setCredentials({ email: '', password: '' });
    } catch (error) {
      setAuthStatus({
        type: 'error',
        message: error.message ?? 'Authentication failed.',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    if (!session) {
      return;
    }

    await signOut({ refreshToken: session.refreshToken, accessToken: session.accessToken });
    setSession(null);
    setAuthStatus({ type: 'success', message: 'Signed out.' });
  };

  const handleAddOption = useCallback(() => {
    setOptions((prev) => [...prev, '']);
  }, []);

  const handleOptionChange = useCallback((index, value) => {
    setOptions((prev) =>
      prev.map((option, idx) => (idx === index ? value : option))
    );
  }, []);

  const resetCreateForm = useCallback(() => {
    setQuestion('');
    setOptions(INITIAL_OPTIONS);
  }, []);

  const handleCreatePoll = async (event) => {
    event.preventDefault();
    setCreateStatus(null);

    if (!isAuthenticated) {
      setCreateStatus({ type: 'error', message: 'Sign in to create polls.' });
      return;
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setCreateStatus({ type: 'error', message: 'Question is required.' });
      return;
    }

    if (trimmedOptions.length < 2) {
      setCreateStatus({
        type: 'error',
        message: 'Please provide at least two options.',
      });
      return;
    }

    setIsCreating(true);

    try {
      const { poll } = await createPoll({
        accessToken: session.accessToken,
        question: trimmedQuestion,
        options: trimmedOptions,
      });

      setActivePoll(poll);
      setPollIdInput(String(poll.id));
      startPolling(poll.id);
      resetCreateForm();
      setCreateStatus({
        type: 'success',
        message: `Poll created (ID: ${poll.id}).`,
      });
    } catch (error) {
      if (error.status === 401) {
        setSession(null);
        setCreateStatus({ type: 'error', message: 'Session expired. Please sign in again.' });
        return;
      }

      setCreateStatus({
        type: 'error',
        message: error.message ?? 'Failed to create poll.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLoadPoll = async (event) => {
    event.preventDefault();
    setPollStatus(null);

    const pollId = Number.parseInt(pollIdInput, 10);

    if (Number.isNaN(pollId)) {
      setPollStatus({ type: 'error', message: 'Enter a valid poll ID.' });
      return;
    }

    setIsLoadingPoll(true);

    try {
      const { poll } = await fetchPoll(pollId);

      if (!poll) {
        setActivePoll(null);
        stopPolling();
        setPollStatus({ type: 'error', message: `Poll #${pollId} not found.` });
        return;
      }

      setActivePoll(poll);
      startPolling(poll.id);
      setPollStatus({
        type: 'success',
        message: `Poll #${poll.id} loaded.`,
      });
    } catch (error) {
      setPollStatus({
        type: 'error',
        message: error.message ?? 'Failed to load poll.',
      });
    } finally {
      setIsLoadingPoll(false);
    }
  };

  const handleVote = async (optionId) => {
    if (!activePoll) {
      return;
    }

    setPollStatus(null);
    setIsVoting(true);

    try {
      const { poll } = await voteOnPoll({ pollId: activePoll.id, optionId });
      setActivePoll(poll);
      setPollStatus({ type: 'success', message: 'Thanks for voting!' });
    } catch (error) {
      setPollStatus({
        type: 'error',
        message: error.message ?? 'Failed to record vote.',
      });
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="app">
      <h1>QuickPoll</h1>
      <p className="subtitle">
        Create polls, share them, and watch votes roll in live. Now with Supabase-backed authentication.
      </p>

      <section className="panel auth-panel">
        <h2>Account</h2>
        {isAuthenticated ? (
          <div className="auth-state">
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            <button type="button" className="secondary" onClick={handleSignOut}>
              Sign out
            </button>
            <StatusMessage status={authStatus} />
          </div>
        ) : (
          <form className="form" onSubmit={handleAuthSubmit}>
            <div className="auth-toggle">
              <label>
                <input
                  type="radio"
                  name="auth-mode"
                  value="sign-in"
                  checked={authMode === 'sign-in'}
                  onChange={() => setAuthMode('sign-in')}
                />{' '}
                Sign in
              </label>
              <label>
                <input
                  type="radio"
                  name="auth-mode"
                  value="sign-up"
                  checked={authMode === 'sign-up'}
                  onChange={() => setAuthMode('sign-up')}
                />{' '}
                Sign up
              </label>
            </div>

            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={credentials.email}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.target.value }))
              }
              minLength={6}
              required
            />

            <button type="submit" className="primary" disabled={isAuthenticating}>
              {isAuthenticating
                ? authMode === 'sign-up'
                  ? 'Creating account…'
                  : 'Signing in…'
                : authMode === 'sign-up'
                  ? 'Create account'
                  : 'Sign in'}
            </button>
            <StatusMessage status={authStatus} />
          </form>
        )}
      </section>

      <section className="panel">
        <h2>Create a Poll</h2>
        {isAuthenticated ? (
          <form className="form" onSubmit={handleCreatePoll}>
            <label htmlFor="question">Question</label>
            <input
              id="question"
              name="question"
              type="text"
              placeholder="What should we order for lunch?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              required
            />

            <label>Options</label>
            <div className="options-editor">
              {options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  value={option}
                  placeholder={`Option ${index + 1}`}
                  onChange={(event) =>
                    handleOptionChange(index, event.target.value)
                  }
                  required={index < 2}
                />
              ))}
            </div>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={handleAddOption}>
                + Add Option
              </button>
              <button type="submit" className="primary" disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create Poll'}
              </button>
            </div>
            <StatusMessage status={createStatus} />
          </form>
        ) : (
          <p className="muted">Sign in to create a new poll.</p>
        )}
      </section>

      <section className="panel">
        <h2>Find a Poll</h2>
        <form className="form horizontal" onSubmit={handleLoadPoll}>
          <input
            type="number"
            min="1"
            placeholder="Enter poll ID"
            value={pollIdInput}
            onChange={(event) => setPollIdInput(event.target.value)}
            required
          />
          <button type="submit" className="secondary" disabled={isLoadingPoll}>
            {isLoadingPoll ? 'Loading…' : 'Load Poll'}
          </button>
        </form>
        <StatusMessage status={pollStatus} />
      </section>

      <PollDetails poll={activePoll} onVote={handleVote} isVoting={isVoting} />
    </div>
  );
}
