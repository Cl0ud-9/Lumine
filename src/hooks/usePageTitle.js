import { useEffect } from 'react';

/**
 * Sets the browser tab title for the lifetime of the calling page, restoring whatever
 * title was there before on unmount. Every route previously shared the same static
 * "Lumine" title from index.html, making tabs/history indistinguishable from each other.
 */
export function usePageTitle(title) {
    useEffect(() => {
        const previous = document.title;
        document.title = title ? `${title} · Lumine` : 'Lumine';
        return () => {
            document.title = previous;
        };
    }, [title]);
}
