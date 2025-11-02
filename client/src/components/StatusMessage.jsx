const toneClassMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function StatusMessage({ status }) {
  if (!status) {
    return null;
  }

  const toneClass = toneClassMap[status.type] ?? 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-3 py-2 text-sm font-medium shadow-sm ${toneClass}`}
    >
      {status.message}
    </div>
  );
}
