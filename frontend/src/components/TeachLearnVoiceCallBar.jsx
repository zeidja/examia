/**
 * Call-style status for Teach & Learn voice call session.
 */
export function TeachLearnVoiceCallBar({
  callActive,
  callAvailable,
  status,
  usingNaturalVoice,
  agentLabel = 'Teach & Learn agent',
}) {
  const statusLabels = {
    idle: 'Press the green call button to start a voice conversation',
    thinking: 'Agent is thinking…',
    speaking: `${agentLabel} is speaking`,
    listening: 'Listening — stop talking briefly to send automatically',
  };

  if (!callAvailable) {
    return (
      <div className="rounded-xl border border-examia-soft/40 bg-examia-soft/10 px-4 py-3 text-xs text-examia-mid">
        Voice call needs Chrome or Edge with microphone access.
      </div>
    );
  }

  if (!callActive) {
    return (
      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-900">
        <span className="font-medium">Voice call</span>
        <span className="text-emerald-800/90"> — use the green phone button next to Send for natural AI speech (like ChatGPT). The mic button only types your words.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-300/50 bg-gradient-to-br from-emerald-50 to-white p-4">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <span
            className={`flex w-14 h-14 rounded-full items-center justify-center ${
              status === 'speaking'
                ? 'bg-examia-dark text-white'
                : status === 'listening'
                  ? 'bg-emerald-500 text-white'
                  : status === 'thinking'
                    ? 'bg-examia-mid text-white'
                    : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </span>
          {(status === 'speaking' || status === 'listening') && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-emerald-400 opacity-40 animate-ping pointer-events-none" />
              <span className="absolute -inset-1 rounded-full border border-emerald-300 opacity-30 animate-pulse pointer-events-none" />
            </>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-examia-dark">Voice call active</p>
          <p className="text-sm font-medium text-examia-dark mt-0.5">{statusLabels[status] || statusLabels.idle}</p>
          <p className="text-xs text-examia-mid mt-1">
            {usingNaturalVoice ? 'Natural AI voice' : 'Speaking…'}
            {' · '}
            Tap the phone button again to hang up.
          </p>
        </div>
      </div>
    </div>
  );
}
