import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StatusMessage from './components/StatusMessage';
import PollDetails from './components/PollDetails';
import {
  signIn,
  signUp,
  signOut,
  createPoll,
  fetchPoll,
  voteOnPoll,
  checkHealth,
  getApiBaseUrl,
} from './lib/apiClient.js';

const REFRESH_INTERVAL = 2000;
const INITIAL_OPTIONS = ['', ''];
const SESSION_STORAGE_KEY = 'quickpoll_session';

const primaryButtonClasses =
  'inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClasses =
  'inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60';
const panelClasses = 'flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/80';
const labelClasses = 'text-sm font-semibold text-slate-700';
const inputClasses =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200';

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
  const [configStatus, setConfigStatus] = useState(null);

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

  useEffect(() => {
    let isMounted = true;

    const verifyApi = async () => {
      try {
        await checkHealth();
        if (isMounted) {
          setConfigStatus(null);
        }
      } catch (error) {
        if (isMounted) {
          setConfigStatus({
            type: 'error',
            message:
              error.message ??
              `Unable to reach API at ${getApiBaseUrl()}. Verify deployment configuration.`,
          });
        }
      }
    };

    verifyApi();

    return () => {
      isMounted = false;
    };
  }, []);

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
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="text-center">
          <h1 className="text-4xl font-semibold text-slate-900">QuickPoll</h1>
          <p className="mx-auto mt-2 max-w-2xl text-base text-slate-600">
            Create polls, share them, and watch votes roll in live — now with Supabase-backed
            authentication.
          </p>
        </header>

        {configStatus ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800 shadow">
            <h2 className="text-lg font-semibold text-amber-900">Configuration issue</h2>
            <p className="mt-1">{configStatus.message}</p>
            <p className="mt-2">
              Ensure <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_API_BASE_URL</code>{' '}
              points to your backend and{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">CLIENT_ORIGIN</code> on the server
              includes {typeof window !== 'undefined' ? window.location.origin : 'this domain'}.
            </p>
          </section>
        ) : null}

        <section className={panelClasses}>
          <h2 className="text-xl font-semibold text-slate-900">Account</h2>
          {isAuthenticated ? (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                Signed in as{' '}
                <strong className="font-semibold text-slate-900">{session.user.email}</strong>
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={secondaryButtonClasses} onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
              <StatusMessage status={authStatus} />
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleAuthSubmit}>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="auth-mode"
                    value="sign-in"
                    checked={authMode === 'sign-in'}
                    onChange={() => setAuthMode('sign-in')}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  Sign in
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="auth-mode"
                    value="sign-up"
                    checked={authMode === 'sign-up'}
                    onChange={() => setAuthMode('sign-up')}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  Sign up
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClasses} htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={credentials.email}
                  onChange={(event) =>
                    setCredentials((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className={inputClasses}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClasses} htmlFor="auth-password">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={credentials.password}
                  onChange={(event) =>
                    setCredentials((prev) => ({ ...prev, password: event.target.value }))
                  }
                  minLength={6}
                  className={inputClasses}
                  required
                />
              </div>

              <button type="submit" className={primaryButtonClasses} disabled={isAuthenticating}>
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

        <section className={panelClasses}>
          <h2 className="text-xl font-semibold text-slate-900">Create a Poll</h2>
          {isAuthenticated ? (
            <form className="flex flex-col gap-4" onSubmit={handleCreatePoll}>
              <div className="flex flex-col gap-2">
                <label className={labelClasses} htmlFor="question">
                  Question
                </label>
                <input
                  id="question"
                  name="question"
                  type="text"
                  placeholder="What should we order for lunch?"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  className={inputClasses}
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <span className={labelClasses}>Options</span>
                <div className="flex flex-col gap-2">
                  {options.map((option, index) => (
                    <input
                      key={index}
                      type="text"
                      value={option}
                      placeholder={`Option ${index + 1}`}
                      onChange={(event) =>
                        handleOptionChange(index, event.target.value)
                      }
                      className={inputClasses}
                      required={index < 2}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" className={secondaryButtonClasses} onClick={handleAddOption}>
                  + Add Option
                </button>
                <button type="submit" className={primaryButtonClasses} disabled={isCreating}>
                  {isCreating ? 'Creating…' : 'Create Poll'}
                </button>
              </div>
              <StatusMessage status={createStatus} />
            </form>
          ) : (
            <p className="text-sm text-slate-600">Sign in to create a new poll.</p>
          )}
        </section>

        <section className={panelClasses}>
          <h2 className="text-xl font-semibold text-slate-900">Find a Poll</h2>
          <form className="flex flex-wrap gap-3" onSubmit={handleLoadPoll}>
            <input
              type="number"
              min="1"
              placeholder="Enter poll ID"
              value={pollIdInput}
              onChange={(event) => setPollIdInput(event.target.value)}
              className={`${inputClasses} flex-1 min-w-[180px]`}
              required
            />
            <button type="submit" className={secondaryButtonClasses} disabled={isLoadingPoll}>
              {isLoadingPoll ? 'Loading…' : 'Load Poll'}
            </button>
          </form>
          <StatusMessage status={pollStatus} />
        </section>

        <PollDetails poll={activePoll} onVote={handleVote} isVoting={isVoting} />
      </div>
    </div>
  );
}
