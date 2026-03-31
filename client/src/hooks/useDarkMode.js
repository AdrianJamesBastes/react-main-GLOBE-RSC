import { useState, useEffect } from 'react';

export default function useDarkMode(initialPreference = null) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (initialPreference !== null) return initialPreference;
    return typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }, [isDarkMode]);

  const toggle = () => setIsDarkMode(prev => !prev);
  return [isDarkMode, toggle];
}
