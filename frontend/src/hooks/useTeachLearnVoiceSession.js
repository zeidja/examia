import { useState, useRef, useCallback, useEffect } from 'react';
import { showError } from '../utils/swal';
import { useSpeechDictation } from './useSpeechDictation';
import { useSpeechPlayback } from './useSpeechPlayback';

const CALL_SILENCE_MS = 1600;
const CALL_MIC_START_MS = 400;

/**
 * Voice dictation, OpenAI TTS playback, and hands-free call mode for Teach & Learn.
 */
export function useTeachLearnVoiceSession({
  input,
  setInput,
  dictationInterim,
  setDictationInterim,
  loading,
  selectedMaterialPaths,
}) {
  const [callActive, setCallActive] = useState(false);
  const [callPreview, setCallPreview] = useState('');
  const callActiveRef = useRef(callActive);
  const sendMessageRef = useRef(null);
  const callBufferRef = useRef('');
  const callInterimRef = useRef('');
  const silenceTimerRef = useRef(null);
  const sendingRef = useRef(false);
  const startDictationRef = useRef(null);
  const micStartTimerRef = useRef(null);
  const agentSpeakingRef = useRef(false);

  callActiveRef.current = callActive;

  const isCallPaused = useCallback(
    () => loading || agentSpeakingRef.current || sendingRef.current,
    [loading]
  );

  const clearCallSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearMicStartTimer = useCallback(() => {
    if (micStartTimerRef.current) {
      clearTimeout(micStartTimerRef.current);
      micStartTimerRef.current = null;
    }
  }, []);

  const getCallPendingText = useCallback(() => {
    const parts = [callBufferRef.current.trim(), callInterimRef.current.trim()].filter(Boolean);
    return parts.join(' ').trim();
  }, []);

  const voiceInputSupported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const appendDictation = useCallback(
    (text) => {
      if (!text) return;
      setInput((prev) => {
        const base = prev.trimEnd();
        return base ? `${base} ${text}` : text;
      });
      setDictationInterim('');
    },
    [setInput, setDictationInterim]
  );

  const scheduleCallAutoSend = useCallback(() => {
    clearCallSilenceTimer();
    if (!callActiveRef.current || isCallPaused()) return;
    silenceTimerRef.current = window.setTimeout(() => {
      const text = getCallPendingText();
      if (!text || isCallPaused()) return;
      sendMessageRef.current?.(text);
    }, CALL_SILENCE_MS);
  }, [clearCallSilenceTimer, getCallPendingText, isCallPaused]);

  const onCallFinalTranscript = useCallback(
    (text) => {
      if (!text || isCallPaused()) return;
      callBufferRef.current = [callBufferRef.current.trim(), text].filter(Boolean).join(' ').trim();
      callInterimRef.current = '';
      setCallPreview(callBufferRef.current);
      scheduleCallAutoSend();
    },
    [isCallPaused, scheduleCallAutoSend]
  );

  const onCallInterimTranscript = useCallback(
    (text) => {
      if (isCallPaused()) return;
      callInterimRef.current = text || '';
      const preview = [callBufferRef.current.trim(), callInterimRef.current.trim()].filter(Boolean).join(' ');
      setCallPreview(preview);
      if (text?.trim()) scheduleCallAutoSend();
    },
    [isCallPaused, scheduleCallAutoSend]
  );

  const speechHandlersRef = useRef({
    onFinal: appendDictation,
    onInterim: setDictationInterim,
  });
  speechHandlersRef.current = callActive
    ? { onFinal: onCallFinalTranscript, onInterim: onCallInterimTranscript }
    : { onFinal: appendDictation, onInterim: setDictationInterim };

  const resumeCallMic = useCallback(() => {
    clearMicStartTimer();
    if (!callActiveRef.current || isCallPaused()) return;
    micStartTimerRef.current = window.setTimeout(() => {
      micStartTimerRef.current = null;
      if (!callActiveRef.current || isCallPaused()) return;
      startDictationRef.current?.();
    }, CALL_MIC_START_MS);
  }, [clearMicStartTimer, isCallPaused]);

  const {
    supported: speakSupported,
    speaking: agentSpeaking,
    usingNaturalVoice,
    speak: speakReply,
    stop: stopSpeaking,
  } = useSpeechPlayback({
    preferOpenAi: true,
    onEnd: () => resumeCallMic(),
  });

  agentSpeakingRef.current = agentSpeaking;

  const {
    supported: voiceSupported,
    listening: voiceListening,
    toggle: toggleDictation,
    stop: stopDictation,
    start: startDictation,
  } = useSpeechDictation({
    onFinalTranscript: (text) => speechHandlersRef.current.onFinal(text),
    onInterimTranscript: (text) => speechHandlersRef.current.onInterim(text),
    onError: (msg) => showError(msg),
    disabled: callActive && (loading || agentSpeaking),
    persistent: callActive,
  });

  startDictationRef.current = startDictation;

  const callAvailable = voiceInputSupported && speakSupported;

  const callStatus = !callActive
    ? 'idle'
    : loading
      ? 'thinking'
      : agentSpeaking
        ? 'speaking'
        : voiceListening
          ? 'listening'
          : 'idle';

  const playAssistantReply = useCallback(
    (content) => {
      if (callActiveRef.current && content) return speakReply(content);
      return Promise.resolve();
    },
    [speakReply]
  );

  useEffect(() => {
    return () => {
      stopSpeaking();
      clearCallSilenceTimer();
      clearMicStartTimer();
    };
  }, [stopSpeaking, clearCallSilenceTimer, clearMicStartTimer]);

  const clearCallBuffers = useCallback(() => {
    callBufferRef.current = '';
    callInterimRef.current = '';
    setCallPreview('');
  }, []);

  const beginSending = useCallback(() => {
    if (sendingRef.current) return false;
    sendingRef.current = true;
    clearCallSilenceTimer();
    clearMicStartTimer();
    stopDictation();
    clearCallBuffers();
    setDictationInterim('');
    setInput('');
    return true;
  }, [clearCallSilenceTimer, clearMicStartTimer, clearCallBuffers, setDictationInterim, setInput, stopDictation]);

  const endSending = useCallback(() => {
    sendingRef.current = false;
  }, []);

  const registerSendMessage = useCallback((fn) => {
    sendMessageRef.current = fn;
  }, []);

  const handleDictateToggle = useCallback(() => {
    if (agentSpeaking) stopSpeaking();
    toggleDictation();
  }, [agentSpeaking, stopSpeaking, toggleDictation]);

  const handleCallToggle = useCallback(() => {
    if (callActive) {
      callActiveRef.current = false;
      setCallActive(false);
      clearCallSilenceTimer();
      clearMicStartTimer();
      clearCallBuffers();
      stopSpeaking();
      stopDictation();
      return;
    }
    if (selectedMaterialPaths.length === 0) {
      showError('Select at least one file before starting a voice call.');
      return;
    }
    callActiveRef.current = true;
    setCallActive(true);
    clearCallSilenceTimer();
    clearCallBuffers();
    stopSpeaking();
    resumeCallMic();
  }, [
    callActive,
    clearCallBuffers,
    clearCallSilenceTimer,
    clearMicStartTimer,
    resumeCallMic,
    selectedMaterialPaths.length,
    stopDictation,
    stopSpeaking,
  ]);

  const composeTextInput = useCallback(() => {
    return `${input}${dictationInterim ? (input && !input.endsWith(' ') ? ' ' : '') + dictationInterim : ''}`.trim();
  }, [dictationInterim, input]);

  const stopVoiceBeforeManualEdit = useCallback(() => {
    stopSpeaking();
    stopDictation();
    setDictationInterim('');
  }, [setDictationInterim, stopDictation, stopSpeaking]);

  return {
    callActive,
    callPreview,
    callAvailable,
    callStatus,
    voiceSupported,
    voiceListening,
    speakSupported,
    agentSpeaking,
    usingNaturalVoice,
    speakReply,
    stopSpeaking,
    stopDictation,
    playAssistantReply,
    getCallPendingText,
    clearCallSilenceTimer,
    clearCallBuffers,
    beginSending,
    endSending,
    registerSendMessage,
    handleCallToggle,
    handleDictateToggle,
    composeTextInput,
    stopVoiceBeforeManualEdit,
  };
}
