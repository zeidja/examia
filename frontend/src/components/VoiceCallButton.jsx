/**
 * Start/end a voice call session (listen + natural AI voice replies).
 */
export function VoiceCallButton({
  active,
  supported,
  onToggle,
  disabled = false,
  className = '',
}) {
  const inactive = disabled || !supported;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={inactive}
      title={
        !supported
          ? 'Voice call needs Chrome or Edge and a working microphone'
          : active
            ? 'End voice call'
            : 'Start voice call — hear natural AI replies and talk back'
      }
      aria-label={active ? 'End voice call' : 'Start voice call'}
      aria-pressed={active}
      className={`relative shrink-0 p-3 rounded-xl border transition-colors ${
        active
          ? 'border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
          : inactive
            ? 'border-examia-soft/30 bg-examia-soft/10 text-examia-mid cursor-not-allowed opacity-60'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      } ${className}`}
    >
      {active && (
        <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-300/80 animate-pulse pointer-events-none" />
      )}
      <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        {active ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        )}
      </svg>
    </button>
  );
}
