import { useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';

const Toast = ({ message, isVisible, onClose }) => {
    // Callers usually pass an inline arrow for onClose, which is a new function every render.
    // Keeping it in a ref means a parent re-render (e.g. a realtime refresh landing while the
    // toast is up) doesn't restart the 3s auto-dismiss timer.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isVisible) return undefined;
        const timer = setTimeout(() => onCloseRef.current(), 3000);
        return () => clearTimeout(timer);
    }, [isVisible, message]);

    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-8 sm:right-8 z-[70] pointer-events-none"
                >
                    <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl" aria-hidden="true">check_circle</span>
                        <span className="font-semibold">{message}</span>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
