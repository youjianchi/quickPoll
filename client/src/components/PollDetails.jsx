function OptionCard({ option, onVote, isVoting }) {
  return (
    <div className="option-card">
      <div className="option-text">{option.text}</div>
      <div className="option-actions">
        <span className="votes">
          {option.votes} vote{option.votes === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          className="primary"
          onClick={() => onVote(option.id)}
          disabled={isVoting}
        >
          Vote
        </button>
      </div>
    </div>
  );
}

export default function PollDetails({ poll, onVote, isVoting }) {
  if (!poll) {
    return null;
  }

  const createdAt = poll.created_at
    ? new Date(poll.created_at).toLocaleString()
    : '';

  return (
    <section className="panel">
      <h2>{poll.question}</h2>
      <p className="poll-meta">
        Poll #{poll.id}
        {createdAt ? ` · Created ${createdAt}` : ''}
      </p>

      <div className="options-grid">
        {poll.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            onVote={onVote}
            isVoting={isVoting}
          />
        ))}
      </div>
    </section>
  );
}
