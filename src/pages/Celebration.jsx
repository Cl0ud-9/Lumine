import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, useAnimation } from 'framer-motion';
import { useApp } from '../context/AppContext';

const CELEBRATION_PHRASES = [
    { title: "You just made \nmy day.", subtitle: "This is going to be unforgettable." },
    { title: "Best. Decision. \nEver.", subtitle: "Get ready for a lifetime of smiles!" },
    { title: "My heart just \nskipped a beat!", subtitle: "You and me? We're going to be epic." },
    { title: "Finally \nI knew it!", subtitle: "I was waiting for this moment." },
    { title: "Yay! \nYou said Yes!", subtitle: "Now the real adventure begins." },
    { title: "Official: \nWe are a thing!", subtitle: "Warning: Excessive happiness ahead." }
];

const SPARKLE_COLORS = ['#d8b4fe', '#f9a8d4', '#ffffff'];
const CONFETTI_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
const SHAKE_ANIMATION = [0, -5, 5, 0];

const Celebration = forwardRef((props, ref) => {
    const { boyfriendName } = useApp();
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const controls = useAnimation(); // Animation controls for the emoji
    const yesControls = useAnimation(); // Animation controls for the YES button

    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    const springConfig = { stiffness: 70, damping: 25, bounce: 0 };
    const smoothedX = useSpring(mouseX, springConfig);
    const smoothedY = useSpring(mouseY, springConfig);

    // ... existing hooks ...

    // Trigger initial entrance animation
    useEffect(() => {
        controls.start({
            scale: 1,
            rotate: -12,
            opacity: 1,
            transition: { type: "spring", bounce: 0.5, delay: 0.4 }
        });

        yesControls.start({
            scale: 1,
            rotate: 6,
            opacity: 1,
            transition: { type: "spring", bounce: 0.5, delay: 1 }
        });
    }, [controls, yesControls]);

    // ... existing code ...

    const intensity = isMobile ? 0.2 : 1;

    const layer1X = useTransform(smoothedX, [0, 1], [10 * intensity, -10 * intensity]);
    const layer1Y = useTransform(smoothedY, [0, 1], [10 * intensity, -10 * intensity]);

    const layer2X = useTransform(smoothedX, [0, 1], [25 * intensity, -25 * intensity]);
    const layer2Y = useTransform(smoothedY, [0, 1], [25 * intensity, -25 * intensity]);

    const layer3X = useTransform(smoothedX, [0, 1], [15 * intensity, -15 * intensity]);
    const layer3Y = useTransform(smoothedY, [0, 1], [15 * intensity, -15 * intensity]);
    const rotateX = useTransform(smoothedY, [0, 1], [isMobile ? 0 : 4, isMobile ? 0 : -4]);
    const rotateY = useTransform(smoothedX, [0, 1], [isMobile ? 0 : -4, isMobile ? 0 : 4]);

    const shadowX = useTransform(smoothedX, [0, 1], [20, -20]);
    const shadowY = useTransform(smoothedY, [0, 1], [40, 0]);
    const boxShadow = useTransform(
        [shadowX, shadowY],
        ([x, y]) => `${x}px ${y}px 50px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.5)`
    );

    const layer4X = useTransform(smoothedX, [0, 1], [40 * intensity, -40 * intensity]);
    const layer4Y = useTransform(smoothedY, [0, 1], [40 * intensity, -40 * intensity]);

    const [elements] = useState(() => {
        const hearts = Array.from({ length: 15 }).map((_, i) => ({
            id: `heart-${i}`,
            type: 'heart',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 15 + Math.random() * 10,
            size: 20 + Math.random() * 30,
            rotate: Math.random() * 30 - 15,
            color: '#ec4899'
        }));

        const sparkles = Array.from({ length: 12 }).map((_, i) => ({
            id: `sparkle-${i}`,
            type: 'sparkle',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 4 + Math.random() * 6,
            size: 15 + Math.random() * 20,
            rotate: Math.random() * 180,
            color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
        }));

        const confetti = Array.from({ length: 30 }).map((_, i) => ({
            id: `confetti-${i}`,
            type: 'confetti',
            left: Math.random() * 100,
            top: -10 - Math.random() * 20,
            delay: Math.random() * 2,
            duration: 3 + Math.random() * 4,
            size: 8 + Math.random() * 8,
            rotate: Math.random() * 360,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            xDrift: Math.random() * 100 - 50
        }));

        return [...hearts, ...sparkles, ...confetti];
    });

    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef(null);

    // Audio initialization
    // 1. FIX AUDIO - wrap play() calls with a cancellable guard
    useEffect(() => {
        let cancelled = false;

        const firecrackers = new Audio('/audio/fire_crackers.mp3');
        const playFirecrackers = async () => {
            try {
                if (!cancelled) await firecrackers.play();
            } catch (e) {
                if (e.name !== 'AbortError') console.log("Audio play failed", e);
            }
        };
        playFirecrackers();

        audioRef.current = new Audio('/audio/until_i_found_her.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;

        const musicTimeout = setTimeout(async () => {
            try {
                if (!cancelled && !isMuted) await audioRef.current.play();
            } catch (e) {
                if (e.name !== 'AbortError') console.log("Music play failed", e);
            }
        }, 3000);

        return () => {
            cancelled = true;
            clearTimeout(musicTimeout);
            firecrackers.pause();
            firecrackers.currentTime = 0;
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle Mute Toggle
    const hasInitializedAudio = useRef(false);
    useEffect(() => {
        if (!hasInitializedAudio.current) {
            hasInitializedAudio.current = true;
            return; // Skip on first mount — audio setup is handled in the other useEffect
        }
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') console.log("Resume failed", e);
                });
            }
        }
    }, [isMuted]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);
        const motionHandler = () => setPrefersReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', motionHandler);

        const handleMouseMove = (e) => {
            if (prefersReducedMotion) return;
            mouseX.set(e.clientX / window.innerWidth);
            mouseY.set(e.clientY / window.innerHeight);
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', checkMobile);
            mediaQuery.removeEventListener('change', motionHandler);
        };
    }, [mouseX, mouseY, prefersReducedMotion]);

    const [phrase] = useState(() => CELEBRATION_PHRASES[Math.floor(Math.random() * CELEBRATION_PHRASES.length)]);

    const [popHearts, setPopHearts] = useState([]);
    const [celebrationPops, setCelebrationPops] = useState([]); // Celebration emoji pops
    const [yesPops, setYesPops] = useState([]); // YES button pops
    const [heat, setHeat] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const holdIntervalRef = React.useRef(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setHeat(h => Math.max(0, h - 2));
        }, 100);
        return () => clearInterval(timer);
    }, []);

    const spawnHearts = (count = 1, forceScale = 1) => {
        const newHearts = Array.from({ length: count }).map(() => {
            const xDrift = (Math.random() - 0.5) * 120 * forceScale;
            const flyUpDistance = -150 - Math.random() * 100;

            const isPurple = heat > 30 || Math.random() < (heat / 50);
            const color = isPurple ? '#a855f7' : '#ec4899';

            return {
                id: Math.random().toString(36),
                x: xDrift,
                y: flyUpDistance,
                rotate: Math.random() * 60 - 30,
                scale: 0.5 + Math.random() * 0.5 * forceScale,
                color
            };
        });
        // Limit total hearts to 25 to prevent lag
        setPopHearts(prev => [...prev.slice(-25), ...newHearts]);
    };

    const handlePress = (e) => {
        if (e.cancelable) e.preventDefault();
        setIsHolding(true);
        setHeat(h => Math.min(100, h + 10));
        spawnHearts(1);

        holdIntervalRef.current = setInterval(() => {
            setHeat(h => Math.min(100, h + 2));
        }, 100);
    };

    const handleRelease = () => {
        if (isHolding) {
            setIsHolding(false);
            clearInterval(holdIntervalRef.current);
            if (heat > 20) spawnHearts(5, 1.5);
        }
    };

    return (
        <motion.div
            ref={ref}
            initial={{ clipPath: "circle(0% at 50% 50%)" }}
            animate={{ clipPath: "circle(150% at 50% 50%)" }}
            transition={{
                duration: 1.5,
                ease: [0.4, 0, 0.2, 1],
                delay: 0
            }}
            className="bg-gradient-mesh font-body min-h-screen w-screen relative overflow-hidden flex items-center justify-center p-4 z-[70]"
        >


            <motion.div
                style={{ x: layer1X, y: layer1Y }}
                className="fixed inset-[-5%] pointer-events-none z-0"
            >
                <div className="floating-orb absolute top-[-5%] left-[-5%] w-[30rem] h-[30rem] bg-pink-300 opacity-20 blur-[100px]" />
                <div className="floating-orb absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-purple-200 opacity-20 blur-[120px]" style={{ animationDelay: '-5s' }} />

                {elements.map((el) => (
                    <motion.div
                        key={el.id}
                        initial={el.type === 'confetti'
                            ? { y: -50, opacity: 1, rotate: 0 }
                            : { y: "110vh", opacity: 0 }
                        }
                        animate={el.type === 'confetti'
                            ? {
                                y: "110vh",
                                opacity: [1, 1, 0],
                                rotate: [0, 360, 720],
                                x: [0, el.xDrift, 0]
                            }
                            : {
                                y: "-10vh",
                                opacity: [0, el.type === 'heart' ? 0.7 : 0.8, 0]
                            }
                        }
                        transition={
                            prefersReducedMotion
                                ? { duration: 0 }
                                : {
                                    duration: el.duration,
                                    repeat: Infinity,
                                    delay: el.delay,
                                    ease: "linear"
                                }
                        }
                        style={{
                            left: `${el.left}%`,
                            position: 'absolute',
                            width: el.size,
                            height: el.size,
                            backgroundColor: el.type === 'confetti' ? el.color : undefined,
                            borderRadius: el.type === 'confetti' ? (Math.random() > 0.5 ? '50%' : '2px') : undefined
                        }}
                    >
                        {el.type === 'heart' && (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full opacity-60 drop-shadow-sm" style={{ transform: `rotate(${el.rotate}deg)`, color: el.color }}>
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.245 15.245 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                        )}
                        {el.type === 'sparkle' && (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full animate-pulse drop-shadow-sm" style={{ transform: `rotate(${el.rotate}deg)`, color: el.color }}>
                                <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" />
                            </svg>
                        )}
                        {/* Confetti uses CSS background color, so no SVG needed */}
                    </motion.div>
                ))}
            </motion.div>

            {/* LAYER 2: Mid Floating Elements */}
            <motion.div
                style={{ x: layer2X, y: layer2Y }}
                className="fixed inset-[-10%] pointer-events-none z-10"
            >
                <div className="absolute top-[15%] left-[10%] text-pink-400 opacity-20">
                    <span className="material-symbols-outlined text-8xl">auto_awesome</span>
                </div>
                <div className="absolute bottom-[25%] right-[15%] text-purple-400 opacity-15">
                    <span className="material-symbols-outlined text-[100px]">favorite</span>
                </div>
                <div className="absolute top-1/2 right-[20%] opacity-30 flex gap-2">
                    <span className="material-symbols-outlined text-2xl text-yellow-300">star</span>
                    <span className="material-symbols-outlined text-lg text-pink-200 mt-4">star</span>
                </div>
            </motion.div>

            <main className="relative z-20 w-full max-w-2xl px-6 perspective-1000">
                <motion.div
                    style={{ x: layer4X, y: layer4Y }}
                    className="absolute inset-0 pointer-events-none z-[80]"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: 30, opacity: 0 }}
                        animate={{ scale: 1, rotate: 20, opacity: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMuted(!isMuted)}
                        className="absolute -top-4 -right-2 md:-top-7 md:right-1 pointer-events-auto cursor-pointer z-50"
                        style={{ right: '0' }}
                    >
                        <div className="bg-white p-3 rounded-full shadow-lg border-2 border-pink-100 text-pink-500 hover:shadow-xl transition-all">
                            <span className="material-symbols-outlined text-xl md:text-2xl">
                                {isMuted ? 'music_off' : 'music_note'}
                            </span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0, rotate: -30, opacity: 0 }}
                        animate={controls}
                        className="absolute -top-4 left-0 md:-top-6 md:-left-2 pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                            // Bounce animation
                            controls.start({
                                scale: [1, 1.2, 0.95, 1.05, 1],
                                rotate: -12, // Maintain rotation
                                transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.3, 0.6, 0.8, 1] }
                            });

                            // Create multiple pops for a burst effect
                            const newPops = Array.from({ length: 5 }).map((_, i) => ({
                                id: Math.random().toString(36),
                                x: (Math.random() - 0.5) * 200, // Increased spread X
                                y: -60 - Math.random() * 150, // Increased Upward spread
                                rotate: Math.random() * 360,
                                scale: 0.5 + Math.random() * 0.5,
                                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                                icon: ['favorite', 'star', 'celebration', 'auto_awesome'][Math.floor(Math.random() * 4)]
                            }));

                            // Add new pops but limit total count to prevent lag
                            setCelebrationPops(prev => [...prev.slice(-40), ...newPops]);
                        }}
                    >
                        <div className="bg-white p-3 rounded-full shadow-lg border-2 border-pink-100 select-none hover:shadow-xl transition-shadow relative">
                            <span className="material-symbols-outlined text-primary-pink text-3xl">celebration</span>

                            {/* Pops originating from this specific emoji */}
                            {celebrationPops.map(pop => (
                                <motion.div
                                    key={pop.id}
                                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                    animate={{
                                        scale: pop.scale,
                                        x: pop.x,
                                        y: pop.y,
                                        opacity: 0,
                                        rotate: pop.rotate
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    onAnimationComplete={() => setCelebrationPops(prev => prev.filter(h => h.id !== pop.id))}
                                    className="absolute left-1/2 top-1/2 pointer-events-none"
                                >
                                    <span
                                        className="material-symbols-outlined text-xl"
                                        style={{ color: pop.color, marginLeft: '-0.5em', marginTop: '-0.5em', display: 'block' }}
                                    >
                                        {pop.icon}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0, rotate: 30, opacity: 0 }}
                        animate={yesControls}
                        className="absolute -bottom-2 -right-2 md:-bottom-2 md:-right-6 pointer-events-auto cursor-pointer"
                        style={{ right: '0' }}
                        onClick={() => {
                            // Bounce animation
                            yesControls.start({
                                scale: [1, 1.2, 0.95, 1.05, 1],
                                rotate: 6, // Maintain rotation
                                transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.3, 0.6, 0.8, 1] }
                            });

                            // Create pops for YES button (Purple 4-point stars)
                            const newYesPops = Array.from({ length: 8 }).map((_, i) => ({
                                id: Math.random().toString(36),
                                x: (Math.random() - 0.5) * 180,
                                y: -50 - Math.random() * 140,
                                rotate: Math.random() * 360,
                                scale: 0.4 + Math.random() * 0.6,
                                color: ['#a855f7', '#d8b4fe', '#c084fc', '#e879f9', '#ffffff'][Math.floor(Math.random() * 5)],
                                icon: 'star4'
                            }));
                            setYesPops(prev => [...prev.slice(-40), ...newYesPops]);
                        }}
                    >
                        <div className="bg-white px-4 py-2 rounded-full shadow-lg border-2 border-purple-100 flex items-center gap-2 select-none hover:shadow-xl transition-shadow relative">
                            <span className="material-symbols-outlined text-accent-purple text-xl">magic_button</span>
                            <span className="font-fredoka text-accent-purple text-xs font-bold tracking-widest uppercase">YES!</span>

                            {/* Pops originating from YES button */}
                            {yesPops.map(pop => (
                                <motion.div
                                    key={pop.id}
                                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                    animate={{
                                        scale: pop.scale,
                                        x: pop.x,
                                        y: pop.y,
                                        opacity: 0,
                                        rotate: pop.rotate
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    onAnimationComplete={() => setYesPops(prev => prev.filter(h => h.id !== pop.id))}
                                    className="absolute left-1/2 top-1/2 pointer-events-none"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="w-6 h-6"
                                        style={{ color: pop.color, marginLeft: '-12px', marginTop: '-12px' }}
                                    >
                                        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                                    </svg>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    style={{
                        x: layer3X,
                        y: layer3Y,
                        rotateX,
                        rotateY,
                        transformStyle: "preserve-3d"
                    }}
                    transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        delay: 0
                    }}
                    className="relative w-full flex flex-col items-center justify-center overflow-visible"
                >


                    <motion.div
                        className="sticker-card rounded-[3rem] p-6 md:p-16 text-center relative overflow-hidden flex flex-col items-center w-full"
                        style={{ boxShadow }}
                    >

                        <div className="mb-6 lg:mb-4 flex justify-center relative select-none">
                            <div className="relative z-50">
                                <motion.div
                                    layoutId="hero-heart"
                                    whileTap={{ scale: 0.9 }}
                                    animate={{
                                        scale: isHolding ? 0.95 : 1,
                                        rotate: heat > 30 ? SHAKE_ANIMATION : 0,
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    onMouseDown={handlePress}
                                    onMouseUp={handleRelease}
                                    onMouseLeave={handleRelease}
                                    onTouchStart={handlePress}
                                    onTouchEnd={handleRelease}
                                    className="cursor-pointer relative z-20"
                                    style={{ transform: "translateZ(50px)" }}
                                >
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                        className="glossy-heart w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden"
                                    >
                                        <span className="material-symbols-outlined text-white text-5xl select-none">favorite</span>

                                        {/* Subtle Glow */}
                                        <motion.div
                                            className="absolute inset-0 bg-white/20 mix-blend-overlay"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: Math.min(heat / 200, 0.3) }}
                                        />
                                    </motion.div>
                                </motion.div>
                            </div>

                            <motion.div
                                initial={{ scale: 0, opacity: 0.6 }}
                                animate={{ scale: 2.2, opacity: 0 }}
                                transition={{ duration: 0.9, ease: "easeOut", delay: 0.5 }}
                                className="absolute inset-0 rounded-full bg-purple-400/40 blur-3xl pointer-events-none"
                            />
                        </div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                        >
                            <motion.h1
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                                className="text-3xl md:text-6xl font-['Fredoka'] font-bold text-[#ff4d7d] leading-tight mb-6 tracking-tight whitespace-pre-line"
                                style={{ willChange: "transform", fontWeight: 700, transform: "translateZ(40px)" }}
                            >
                                {phrase.title}
                            </motion.h1>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        >
                            <motion.p
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.6 }}
                                className="text-xl md:text-3xl text-pink-500/80 font-['Pacifico'] italic"
                                style={{ willChange: "transform", transform: "translateZ(30px)" }}
                            >
                                {phrase.subtitle}
                            </motion.p>
                        </motion.div>

                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            className="mt-16 flex justify-center gap-4"
                            style={{ transform: "translateZ(15px)" }}
                        >
                            <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
                            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                            <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                        </motion.div>
                    </motion.div>



                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 100 }}>
                        {popHearts.map(heart => (
                            <motion.div
                                key={heart.id}
                                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                animate={{
                                    scale: heart.scale,
                                    x: heart.x,
                                    y: heart.y - 120,
                                    opacity: 0,
                                    rotate: heart.rotate
                                }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                onAnimationComplete={() => setPopHearts(prev => prev.filter(h => h.id !== heart.id))}
                                className="absolute left-1/2 ml-[-1rem] mt-[-1rem] pointer-events-none"
                                style={{
                                    top: "28%",
                                    transform: "translateZ(60px)",
                                }}
                            >
                                <span
                                    className="material-symbols-outlined text-3xl"
                                    style={{ color: heart.color }}
                                >
                                    favorite
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </main>


            <motion.div
                style={{ x: layer4X, y: layer4Y }}
                className="fixed inset-[-15%] pointer-events-none z-30"
            >
                <div className="absolute top-[10%] right-[15%] text-pink-400/10 blur-xl">
                    <span className="material-symbols-outlined text-[200px] fill-1">favorite</span>
                </div>
                <div className="absolute bottom-[5%] left-[5%] text-purple-400/5 blur-2xl">
                    <span className="material-symbols-outlined text-[300px] fill-1">heart_plus</span>
                </div>
            </motion.div>

            <div className="fixed bottom-8 md:bottom-12 left-0 w-full z-40 text-center pointer-events-none">
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.5, y: 0 }}
                    transition={{ delay: 1.5, duration: 1.2 }}
                    className="text-sm font-display font-bold tracking-[0.3em] text-[#881337] uppercase"
                >
                    Now let’s make it special
                </motion.p>
            </div>
        </motion.div >
    );
});

Celebration.displayName = 'Celebration';

export default Celebration;
