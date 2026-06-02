import { useState, useEffect, useRef, useCallback } from 'react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Browser speech-to-text for chat inputs (Chrome, Edge, Safari).
 * @param {{ onFinalTranscript?: (text: string) => void, onInterimTranscript?: (text: string) => void, onError?: (message: string) => void, disabled?: boolean, lang?: string, persistent?: boolean }} options
 * persistent — restart mic after the browser ends a session (voice call), unless disabled or stopped
 */
export function useSpeechDictation({
  onFinalTranscript,
  onInterimTranscript,
  onError,
  disabled = false,
  lang,
  persistent = false,
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const persistentRef = useRef(persistent);
  const disabledRef = useRef(disabled);
  const intentionalStopRef = useRef(false);
  const restartTimerRef = useRef(null);
  const startRef = useRef(() => {});
  const callbacksRef = useRef({ onFinalTranscript, onInterimTranscript, onError });

  persistentRef.current = persistent;
  disabledRef.current = disabled;
  callbacksRef.current = { onFinalTranscript, onInterimTranscript, onError };

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    clearRestartTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, [clearRestartTimer]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    if (disabled) {
      stop();
    }
  }, [disabled, stop]);

  const scheduleRestart = useCallback(() => {
    clearRestartTimer();
    if (!persistentRef.current || disabledRef.current || intentionalStopRef.current) return;
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!persistentRef.current || disabledRef.current || intentionalStopRef.current) return;
      startRef.current();
    }, 300);
  }, [clearRestartTimer]);

  const start = useCallback(() => {
    if (disabledRef.current || !supported) return;
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    intentionalStopRef.current = false;
    clearRestartTimer();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || 'en-US';

    recognition.onresult = (event) => {
      const { onFinalTranscript: onFinal, onInterimTranscript: onInterim } = callbacksRef.current;
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final.trim()) onFinal?.(final.trim());
      if (interim.trim()) onInterim?.(interim.trim());
      else onInterim?.('');
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      setListening(false);
      recognitionRef.current = null;
      const { onError: onErr } = callbacksRef.current;
      const messages = {
        'not-allowed': 'Microphone access was denied. Allow the microphone in your browser settings.',
        'service-not-allowed': 'Speech recognition is not allowed on this page.',
        'no-speech': '',
        aborted: '',
      };
      const msg = messages[event.error] ?? (event.error ? `Voice input error: ${event.error}` : '');
      if (msg) onErr?.(msg);
      if (event.error === 'no-speech') {
        scheduleRestart();
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (persistentRef.current && !disabledRef.current && !intentionalStopRef.current) {
        scheduleRestart();
        return;
      }
      setListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch (err) {
      callbacksRef.current.onError?.(err.message || 'Could not start voice input');
      setListening(false);
    }
  }, [supported, lang, clearRestartTimer, scheduleRestart]);

  startRef.current = start;

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
