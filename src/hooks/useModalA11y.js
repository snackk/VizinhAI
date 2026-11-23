import { useEffect, useRef } from 'react';

/**
 * Reusable modal accessibility hook.
 *
 * While `isOpen` is true, listens for the Escape key and calls `onClose`,
 * and moves focus to the first focusable element inside the returned
 * container ref. The keydown listener is removed whenever `isOpen`
 * flips to false or the component unmounts, so no dangling listener is
 * left behind for a later, unrelated modal to trigger.
 *
 * Usage:
 *   const modalRef = useModalA11y(isOpen, closeHandler);
 *   <div ref={modalRef} role="dialog" aria-modal="true">...</div>
 */
export function useModalA11y(isOpen, onClose) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const focusable = containerRef.current?.querySelector('input, button, [tabindex]');
    if (focusable) {
      focusable.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return containerRef;
}

export default useModalA11y;
