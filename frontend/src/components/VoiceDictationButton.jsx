/**
 * Microphone toggle for speech-to-text in chat inputs.
 */
export function VoiceDictationButton({
  supported,
  listening,
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
          ? 'Voice dictation is not supported in this browser (try Chrome or Edge)'
          : listening
            ? 'Stop dictation'
            : 'Start voice dictation'
      }
      aria-label={listening ? 'Stop voice dictation' : 'Start voice dictation'}
      aria-pressed={listening}
      className={`relative shrink-0 p-3 rounded-xl border transition-colors ${
        listening
          ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : inactive
            ? 'border-examia-soft/30 bg-examia-soft/10 text-examia-mid cursor-not-allowed opacity-60'
            : 'border-examia-soft/50 bg-white text-examia-dark hover:bg-examia-soft/15'
      } ${className}`}
    >
      {listening && (
        <span className="absolute inset-0 rounded-xl ring-2 ring-rose-400/60 animate-pulse pointer-events-none" />
      )}
      <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        {listening ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        )}
      </svg>
    </button>
  );
}
