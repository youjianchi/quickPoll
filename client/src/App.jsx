import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import StatusMessage from './components/StatusMessage';
import PollDetails from './components/PollDetails';
import { getSupabaseClient } from './lib/supabaseClient';
import { createPollWithOptions, fetchPollById, voteOnOption } from './lib/polls';

const REFRESH_INTERVAL = 2000;
const INITIAL_OPTIONS = ['', ''];

export default function App() {
  const { client: supabase, error: configError } = getSupabaseClient();

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

  const trimmedOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options]
  );

  const resetCreateForm = useCallback(() => {
    setQuestion('');
    setOptions(INITIAL_OPTIONS);
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
          const latest = await fetchPollById(supabase, pollId);
          if (latest) {
            setActivePoll(latest);
          }
        } catch (error) {
          console.error('Failed to refresh poll:', error);
        }
      }, REFRESH_INTERVAL);
    },
    [stopPolling, supabase]
  );

  useEffect(() => stopPolling, [stopPolling]);

  const handleAddOption = useCallback(() => {
    setOptions((prev) => [...prev, '']);
  }, []);

  const handleOptionChange = useCallback((index, value) => {
    setOptions((prev) =>
      prev.map((option, idx) => (idx === index ? value : option))
    );
  }, []);

  if (configError) {
    return (
      <div className="app">
        <h1>QuickPoll</h1>
        <p className="subtitle">
          Configure your Supabase environment variables to get started.
        </p>
        <div className="panel config-error">
          <h2>Missing configuration</h2>
          <p>{configError}</p>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> inside the{' '}
            <code>client/</code> folder, then fill in your Supabase project URL and anon key.
            After saving, restart <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  const handleCreatePoll = async (event) => {
    event.preventDefault();
    setCreateStatus(null);

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
      const pollId = await createPollWithOptions(
        supabase,
        trimmedQuestion,
        trimmedOptions
      );

      const latest = await fetchPollById(supabase, pollId);
      setActivePoll(latest);
      setPollIdInput(String(pollId));
      startPolling(pollId);
      resetCreateForm();
      setCreateStatus({
        type: 'success',
        message: `Poll created (ID: ${pollId}).`,
      });
    } catch (error) {
      console.error('Failed to create poll:', error);
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
      const poll = await fetchPollById(supabase, pollId);

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
      console.error('Failed to load poll:', error);
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
      const voteApplied = await voteOnOption(
        supabase,
        activePoll.id,
        optionId
      );

      if (!voteApplied) {
        setPollStatus({
          type: 'error',
          message: 'Option not found for this poll.',
        });
        return;
      }

      const latest = await fetchPollById(supabase, activePoll.id);
      setActivePoll(latest);
      setPollStatus({ type: 'success', message: 'Thanks for voting!' });
    } catch (error) {
      console.error('Failed to record vote:', error);
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
        Create polls, share them, and watch votes roll in live. Powered by Supabase — no custom backend required.
      </p>

      <section className="panel">
        <h2>Create a Poll</h2>
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
            <button
              type="button"
              className="secondary"
              onClick={handleAddOption}
            >
              + Add Option
            </button>
            <button type="submit" className="primary" disabled={isCreating}>
              {isCreating ? 'Creating…' : 'Create Poll'}
            </button>
          </div>
          <StatusMessage status={createStatus} />
        </form>
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
          <button
            type="submit"
            className="secondary"
            disabled={isLoadingPoll}
          >
            {isLoadingPoll ? 'Loading…' : 'Load Poll'}
          </button>
        </form>
        <StatusMessage status={pollStatus} />
      </section>

      <PollDetails poll={activePoll} onVote={handleVote} isVoting={isVoting} />
    </div>
  );
}
