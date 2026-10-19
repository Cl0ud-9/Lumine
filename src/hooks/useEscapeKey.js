import { useEffect, useRef } from 'react';

/**
 * Calls onEscape when the Escape key is pressed while `active` is true. Used by the modal
 * dialogs so they can be dismissed from the keyboard, not just by clicking the backdrop.
 */
export function useEscapeKey(active, onEscape) {
    const handlerRef = useRef(onEscape);
    useEffect(() => {
        handlerRef.current = onEscape;
    }, [onEscape]);

    useEffect(() => {
        if (!active) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') handlerRef.current();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [active]);
}
