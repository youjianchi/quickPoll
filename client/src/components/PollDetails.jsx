const containerClasses =
  'flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/80';
const optionCardClasses =
  'flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm';
const voteButtonClasses =
  'inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60';

function OptionCard({ option, onVote, isVoting }) {
  return (
    <div className={optionCardClasses}>
      <div className="text-base font-semibold text-slate-900">{option.text}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span className="font-medium text-slate-700">
          {option.votes} vote{option.votes === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          className={voteButtonClasses}
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

  const createdAt = poll.created_at ? new Date(poll.created_at).toLocaleString() : '';

  return (
    <section className={containerClasses}>
      <h2 className="text-xl font-semibold text-slate-900">{poll.question}</h2>
      <p className="text-sm text-slate-600">
        Poll #{poll.id}
        {createdAt ? ` · Created ${createdAt}` : ''}
      </p>

      <div className="grid gap-3">
        {poll.options.map((option) => (
          <OptionCard key={option.id} option={option} onVote={onVote} isVoting={isVoting} />
        ))}
      </div>
    </section>
  );
}
