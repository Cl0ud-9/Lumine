import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingScreen = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 4500); // 4s animation + 0.5s buffer

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark font-jakarta overflow-hidden flex flex-col items-center justify-center min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1, transition: { duration: 0 } }}
        >
            {/* Animated Background */}
            <div className="absolute inset-0 z-0 bg-animated-pastel">
                <span className="material-symbols-outlined floating-heart text-pink-200 text-4xl" style={{ top: '15%', left: '10%', animationDelay: '0s' }}>favorite</span>
                <span className="material-symbols-outlined floating-heart text-pink-200 text-2xl" style={{ top: '65%', left: '85%', animationDelay: '1s' }}>favorite</span>
                <span className="material-symbols-outlined floating-heart text-pink-200 text-5xl" style={{ top: '80%', left: '15%', animationDelay: '2s' }}>favorite</span>
                <span className="material-symbols-outlined floating-heart text-pink-200 text-3xl" style={{ top: '20%', left: '75%', animationDelay: '3s' }}>favorite</span>
            </div>

            <main className="relative z-10 flex flex-col items-center justify-center w-full px-6">
                <div className="flex flex-col items-center space-y-12">
                    <div className="relative animate-heartbeat">
                        <div className="w-36 h-36 md:w-48 md:h-48 glossy-bubble-heart rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[72px] md:text-[96px] text-white">
                                favorite
                            </span>
                        </div>
                    </div>
                    <div className="w-64 md:w-80">
                        <div className="relative h-2.5 w-full bg-blush-pink rounded-full overflow-hidden">
                            <div className="progress-fill absolute top-0 left-0 h-full rounded-full"></div>
                        </div>
                        <p className="text-loading-primary/60 text-sm font-medium mt-6 text-center tracking-[0.2em] uppercase">Preparing your heart...</p>
                    </div>
                </div>
            </main>

            {/* Hidden images to preload */}
            <div className="hidden">
                <img alt="preload" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDGAfDFUioUU9jH1tn0xRUZxVKv-Ca6YY1bWPDouNKjoeXTPGag_wY6LRzpKBIYpclHxR2irnIA4zD30tjpZT_N1yh2tIQiZLHbARWKVJU3dXoZnRphb7XO6MnwwdrS-DWRHmMtTcd6In1TalgbzJ7DJrzVuFPGAcob9sL3mHK2YsMgtEA3BEaM-_EiP8pZaS6toN64oJO3ZxcSSMRzsZZphQjNvsrN-XK1p8yoGTh-mWhDxFD_zqoxquaSaD3JUtIvuP4yfkhagM" />
                <img alt="preload" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkHX-AZfDGJAQFPjnuUr897kATFKhLQsLT-6XWh0fhjQKRl8OF_FBmw8S1kZwqQbcCSoR26AHXJBtVxizvsjxTa8QXt-_TkKomJZQfg9awswpFsELQaOlBwJSfBVAx6PWKd4qFFBXIjUnMwxxf_qlMMq3QYAcuX7D9z8NawpxrQmHmGm8PCFupDTYYdOTDpTXAjZR5HGXB2bExtWhWddLEaobxS8waBD5e4EG7S1-s6I4ccDL7Oa0lyOodU0qEsld8OfmMpFsuL6M" />
            </div>
        </motion.div>
    );
};

export default LoadingScreen;
