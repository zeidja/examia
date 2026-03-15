import { createContext, useContext } from 'react';

export const QuizFullscreenContext = createContext({ quizFullscreen: false, setQuizFullscreen: () => {} });

export function useQuizFullscreen() {
  return useContext(QuizFullscreenContext);
}
