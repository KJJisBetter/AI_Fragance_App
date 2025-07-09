import { useState, useEffect, useCallback } from 'react';

export const useGlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => {
    console.log('Opening search, current state:', isOpen);
    setIsOpen(true);
  }, [isOpen]);

  const closeSearch = useCallback(() => {
    console.log('Closing search, current state:', isOpen);
    setIsOpen(false);
  }, [isOpen]);

  const toggleSearch = useCallback(() => {
    console.log('Toggling search, current state:', isOpen);
    setIsOpen(prev => !prev);
  }, [isOpen]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        toggleSearch();
      }

      // Close on Escape (only when search is open)
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeSearch();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown, true);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, toggleSearch, closeSearch]);

  // Prevent body scrolling when search is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  return {
    isOpen,
    openSearch,
    closeSearch,
    toggleSearch
  };
};
