import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { stripMarkdownForSpeech } from '../utils/speechText';

function pickPreferredVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang.startsWith('en') && /google|samantha|daniel|natural/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0]
  );
}

/**
 * AI reply playback: OpenAI TTS (natural) with browser speechSynthesis fallback.
 */
export function useSpeechPlayback({ onStart, onEnd, onError, preferOpenAi = true } = {}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [usingNaturalVoice, setUsingNaturalVoice] = useState(false);
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  const callbacksRef = useRef({ onStart, onEnd, onError });
  callbacksRef.current = { onStart, onEnd, onError };

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && ('speechSynthesis' in window || preferOpenAi));
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => pickPreferredVoice();
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
    return undefined;
  }, [preferOpenAi]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      if (audioRef.current._objectUrl) {
        URL.revokeObjectURL(audioRef.current._objectUrl);
        audioRef.current._objectUrl = null;
      }
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeaking(false);
    setUsingNaturalVoice(false);
  }, []);

  const speakWithBrowser = useCallback((plain) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      callbacksRef.current.onEnd?.();
      return;
    }
    setUsingNaturalVoice(false);
    const utterance = new SpeechSynthesisUtterance(plain);
    const voice = pickPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 0.95;

    utterance.onstart = () => {
      setSpeaking(true);
      callbacksRef.current.onStart?.();
    };
    utterance.onend = () => {
      setSpeaking(false);
      utteranceRef.current = null;
      callbacksRef.current.onEnd?.();
    };
    utterance.onerror = (e) => {
      setSpeaking(false);
      utteranceRef.current = null;
      if (e.error !== 'interrupted') callbacksRef.current.onError?.(e.error || 'playback-failed');
      callbacksRef.current.onEnd?.();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    async (text) => {
      const plain = stripMarkdownForSpeech(text);
      if (!plain) return;

      stop();
      setSpeaking(true);
      callbacksRef.current.onStart?.();

      if (preferOpenAi) {
        try {
          const { data } = await api.post('/ai/speech', { text: plain }, { responseType: 'blob' });
          const url = URL.createObjectURL(data);
          const audio = new Audio(url);
          audio._objectUrl = url;
          audioRef.current = audio;
          setUsingNaturalVoice(true);

          audio.onended = () => {
            stop();
            callbacksRef.current.onEnd?.();
          };
          audio.onerror = () => {
            stop();
            callbacksRef.current.onError?.('audio-playback-failed');
            callbacksRef.current.onEnd?.();
          };

          await audio.play();
          return;
        } catch {
          setSpeaking(false);
          setUsingNaturalVoice(false);
        }
      }

      speakWithBrowser(plain);
    },
    [preferOpenAi, stop, speakWithBrowser]
  );

  return { supported, speaking, usingNaturalVoice, speak, stop };
}
