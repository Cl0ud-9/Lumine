// Thin console wrapper that no-ops in production builds. Keeps the dev-time visibility
// (Supabase errors, realtime events, autoplay failures) without shipping console noise -
// or leaking internal error details - to every visitor's devtools in production.
const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args) => {
        if (isDev) console.log(...args);
    },
    error: (...args) => {
        if (isDev) console.error(...args);
    },
    warn: (...args) => {
        if (isDev) console.warn(...args);
    },
};
