import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const MagicalBackground = () => {
    // Generate static hearts and sparkles to avoid hydration mismatch
    const [elements] = useState(() => {
        const hearts = Array.from({ length: 15 }).map((_, i) => ({
            id: `heart-${i}`,
            type: 'heart',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 15 + Math.random() * 10,
            size: 20 + Math.random() * 30, // 20px - 50px
            rotate: Math.random() * 30 - 15,
        }));

        const sparkles = Array.from({ length: 12 }).map((_, i) => ({
            id: `sparkle-${i}`,
            type: 'sparkle',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 4 + Math.random() * 6,
            size: 10 + Math.random() * 15,
            rotate: Math.random() * 180,
        }));

        return [...hearts, ...sparkles];
    });

    const [isMobile, setIsMobile] = useState(false);

    // Parallax logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 150 };
    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    const layer1X = useTransform(mouseX, [-0.5, 0.5], [20, -20]);
    const layer1Y = useTransform(mouseY, [-0.5, 0.5], [20, -20]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.matchMedia("(pointer: coarse)").matches);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const handleMouseMove = (e) => {
            if (isMobile) return;
            const { innerWidth, innerHeight } = window;
            x.set((e.clientX / innerWidth) - 0.5);
            y.set((e.clientY / innerHeight) - 0.5);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', checkMobile);
        };
    }, [isMobile, x, y]);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-surface">
            {/* Floating Elements with Parallax */}
            <motion.div
                style={{ x: layer1X, y: layer1Y }}
                className="absolute inset-[-5%]" // slightly larger to prevent edge clipping
            >
                {elements.map((el) => (
                    <motion.div
                        key={el.id}
                        initial={{ y: "110vh", opacity: 0 }}
                        animate={{
                            y: "-10vh",
                            opacity: [0, el.type === 'heart' ? 0.8 : 0.9, 0]
                        }}
                        transition={{
                            duration: el.duration,
                            repeat: Infinity,
                            delay: el.delay,
                            ease: "linear"
                        }}
                        style={{
                            left: `${el.left}%`,
                            position: 'absolute',
                            width: el.size,
                            height: el.size,
                        }}
                    >
                        {el.type === 'heart' ? (
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="text-[#be123c] w-full h-full opacity-80"
                                style={{ transform: `rotate(${el.rotate}deg)` }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                        ) : (
                            <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="text-white w-full h-full animate-pulse drop-shadow-sm"
                                style={{ transform: `rotate(${el.rotate}deg)` }}
                            >
                                <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" />
                            </svg>
                        )}
                    </motion.div>
                ))}
            </motion.div>

            {/* Subtle Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        </div>
    );
};

export default MagicalBackground;
