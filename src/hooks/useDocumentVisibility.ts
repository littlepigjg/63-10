import { useState, useEffect, useCallback } from 'react';

export function useDocumentVisibility() {
  const [isVisible, setIsVisible] = useState<boolean>(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
  );

  const handleVisibilityChange = useCallback(() => {
    setIsVisible(document.visibilityState === 'visible');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    isVisible,
    isHidden: !isVisible,
  };
}
