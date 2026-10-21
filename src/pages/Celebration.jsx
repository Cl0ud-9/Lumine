import { useState, useEffect, forwardRef, useRef } from 'react';
import { m, useMotionValue, useSpring, useTransform, useAnimation } from 'framer-motion';
import { useFloatingElements } from '../hooks/useFloatingElements';
import FloatingParticles from '../components/FloatingParticles';
import { logger } from '../lib/logger';
import { usePageTitle } from '../hooks/usePageTitle';
import { isCoarsePointer } from '../lib/device';


const CELEBRATION_PHRASES = [
    { title: "You just made \nmy day.", subtitle: "This is going to be unforgettable." },
    { title: "Best. Decision. \nEver.", subtitle: "Get ready for a lifetime of smiles!" },
    { title: "My heart just \nskipped a beat!", subtitle: "You and me? We're going to be epic." },
    { title: "Finally \nI knew it!", subtitle: "I was waiting for this moment." },
    { title: "Yay! \nYou said Yes!", subtitle: "Now the real adventure begins." },
    { title: "Official: \nWe are a thing!", subtitle: "Warning: Excessive happiness ahead." }
];

const CONFETTI_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
const SHAKE_ANIMATION = [0, -5, 5, 0];

const Celebration = forwardRef((props, ref) => {
    usePageTitle('Yay!');
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    // Touch screens get the lighter variants (fade-in reveal, fewer particles, no pointer parallax).
    const [isTouch] = useState(isCoarsePointer);
    const controls = useAnimation(); // Animation controls for the emoji
    const yesControls = useAnimation(); // Animation controls for the YES button
    const musicControls = useAnimation(); // Animation controls for the music button

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

        musicControls.start({
            scale: 1,
            rotate: 20,
            opacity: 1,
            transition: { type: "spring", bounce: 0.5, delay: 1.2 }
        });
    }, [controls, yesControls, musicControls]);

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

    const layer4X = useTransform(smoothedX, [0, 1], [40 * intensity, -40 * intensity]);
    const layer4Y = useTransform(smoothedY, [0, 1], [40 * intensity, -40 * intensity]);

    // Trimmed from 15/12/30 (57 concurrently-animating elements) to 8/6/16 (30) - the ambient
    // field still reads as "full" but roughly halves the number of infinite Framer Motion loops
    // running at once, which is what was making the click response feel laggy.
    // Phones: 6/4/10 - each particle is its own GPU layer and too many made mobile browsers drop tiles.
    const elements = useFloatingElements({
        heartCount: isTouch ? 6 : 8,
        sparkleCount: isTouch ? 4 : 6,
        confettiCount: isTouch ? 10 : 16,
        heartColor: '#ec4899',
        confettiColors: CONFETTI_COLORS,
    });

    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef(null);

    // Audio initialization
    useEffect(() => {
        let cancelled = false;

        // Compressed from the original lossless FLAC (5.7MB -> ~1MB, same ~53s clip) - this is
        // background music, so the lossless bytes weren't buying anything perceptible while
        // costing every visitor a multi-megabyte download at the exact moment the celebration
        // animations kick in.
        audioRef.current = new Audio('/audio/i_think_they_call_this_love.mp3');
        audioRef.current.volume = 0.5;

        const playMusic = async () => {
            try {
                if (!cancelled && !isMuted) await audioRef.current.play();
            } catch (e) {
                // AbortError just means we were unmounted / paused mid-load. Anything else
                // (typically NotAllowedError from the browser's autoplay policy) means nothing
                // is actually playing, so show the muted icon - otherwise the button claims
                // music is on, and the first tap "mutes" silence instead of starting it.
                if (e.name !== 'AbortError') {
                    logger.error("Music play failed", e);
                    if (!cancelled) setIsMuted(true);
                }
            }
        };
        playMusic();

        return () => {
            cancelled = true;
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
            return; // Skip on first mount - audio setup is handled in the other useEffect
        }
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') {
                        logger.error("Resume failed", e);
                        setIsMuted(true);
                    }
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

        // Real mouse only. A tap on a phone also fires emulated mouse events at the tap point, which
        // used to send every parallax layer (including the tapped YES / music badges) springing
        // sideways under the finger - it read as the badges flickering when touched.
        const handleMouseMove = (e) => {
            if (prefersReducedMotion || e.pointerType !== 'mouse') return;
            mouseX.set(e.clientX / window.innerWidth);
            mouseY.set(e.clientY / window.innerHeight);
        };

        window.addEventListener('pointermove', handleMouseMove);

        return () => {
            window.removeEventListener('pointermove', handleMouseMove);
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
    const holdIntervalRef = useRef(null);
    const isHoldingRef = useRef(false);

    // Decay only runs while there is heat to shed. A permanent 100ms interval re-rendered this
    // whole animated page ten times a second even when nobody had touched the heart.
    const isHot = heat > 0;
    useEffect(() => {
        if (!isHot) return undefined;
        const timer = setInterval(() => {
            setHeat(h => Math.max(0, h - 2));
        }, 100);
        return () => clearInterval(timer);
    }, [isHot]);

    useEffect(() => () => clearInterval(holdIntervalRef.current), []);

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

    // Driven by pointer events, with a ref guard. The old onMouseDown + onTouchStart pair both
    // fired for one touch (touchstart, then the emulated mousedown), starting two intervals and
    // overwriting the first one's id - the orphaned interval then pumped heat forever.
    const handlePress = (e) => {
        if (e.cancelable) e.preventDefault();
        if (isHoldingRef.current) return;
        isHoldingRef.current = true;
        setIsHolding(true);
        setHeat(h => Math.min(100, h + 10));
        spawnHearts(1);

        holdIntervalRef.current = setInterval(() => {
            setHeat(h => Math.min(100, h + 2));
        }, 100);
    };

    const handleRelease = () => {
        if (!isHoldingRef.current) return;
        isHoldingRef.current = false;
        setIsHolding(false);
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        if (heat > 20) spawnHearts(5, 1.5);
    };

    return (
        <m.div
            ref={ref}
            // Desktop: opens out of the middle of the colour wipe. Phones fade in instead - animating
            // clip-path over this whole animated page flickered there.
            initial={isTouch ? { opacity: 0 } : { clipPath: "circle(0% at 50% 50%)" }}
            animate={isTouch ? { opacity: 1 } : { clipPath: "circle(150% at 50% 50%)" }}
            transition={{
                duration: 1.5,
                ease: [0.4, 0, 0.2, 1],
                delay: 0
            }}
            className="bg-gradient-mesh font-body min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 [@media(max-height:500px)]:p-2 z-[70]"
        >


            <m.div
                style={{ x: layer1X, y: layer1Y }}
                aria-hidden="true" className="fixed inset-[-5%] pointer-events-none z-0"
            >
                {/* Note: .floating-orb's own CSS blur(60px) wins the cascade over any
                    blur-[…] utility placed on the same element (equal specificity, later
                    source order), so those utilities were previously silent no-ops. */}
                <div className="floating-orb absolute top-[-5%] left-[-5%] w-[30rem] h-[30rem] bg-pink-300 opacity-20" />
                <div className="floating-orb absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-purple-200 opacity-20" style={{ animationDelay: '-5s' }} />

                <FloatingParticles elements={elements} prefersReducedMotion={prefersReducedMotion} heartVariant="filled" />
            </m.div>

            {/* LAYER 2: Mid Floating Elements */}
            <m.div
                style={{ x: layer2X, y: layer2Y }}
                aria-hidden="true" className="fixed inset-[-10%] pointer-events-none z-10"
            >
                <div className="absolute top-[15%] left-[10%] text-pink-400 opacity-20">
                    <span aria-hidden="true" className="material-symbols-outlined text-8xl">auto_awesome</span>
                </div>
                <div className="absolute bottom-[25%] right-[15%] text-purple-400 opacity-15">
                    <span aria-hidden="true" className="material-symbols-outlined text-[100px]">favorite</span>
                </div>
                <div className="absolute top-1/2 right-[20%] opacity-30 flex gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-2xl text-yellow-300">star</span>
                    <span aria-hidden="true" className="material-symbols-outlined text-lg text-pink-200 mt-4">star</span>
                </div>
            </m.div>

            <main className="relative z-20 w-full max-w-2xl px-6 perspective-1000">
                <m.div
                    style={{ x: layer4X, y: layer4Y }}
                    className="absolute inset-0 pointer-events-none z-[80]"
                >
                    <m.div
                        initial={{ scale: 0, rotate: 30, opacity: 0 }}
                        animate={musicControls}
                        onClick={() => {
                            setIsMuted(!isMuted);
                            musicControls.start({
                                scale: [1, 1.2, 0.95, 1.05, 1],
                                rotate: 20,
                                transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.3, 0.6, 0.8, 1] }
                            });
                        }}
                        className="absolute -top-4 -right-2 md:-top-7 md:right-1 pointer-events-auto cursor-pointer z-50"
                        style={{ right: '0', willChange: "transform" }}
                    >
                        <div className="bg-white p-3 rounded-full shadow-lg border-2 border-pink-100 text-pink-500 hover:shadow-xl transition-all">
                            <span aria-hidden="true" className="material-symbols-outlined text-xl md:text-2xl">
                                {isMuted ? 'music_off' : 'music_note'}
                            </span>
                        </div>
                    </m.div>

                    <m.div
                        initial={{ scale: 0, rotate: -30, opacity: 0 }}
                        animate={controls}
                        className="absolute -top-4 left-0 md:-top-6 md:-left-2 pointer-events-auto cursor-pointer touch-manipulation"
                        onClick={() => {
                            // Bounce animation
                            controls.start({
                                scale: [1, 1.2, 0.95, 1.05, 1],
                                rotate: -12, // Maintain rotation
                                transition: { duration: 0.5, ease: "easeInOut", times: [0, 0.3, 0.6, 0.8, 1] }
                            });

                            // Create multiple pops for a burst effect
                            const newPops = Array.from({ length: 5 }).map(() => ({
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
                            <span aria-hidden="true" className="material-symbols-outlined text-primary-pink text-3xl">celebration</span>

                            {/* Pops originating from this specific emoji */}
                            {celebrationPops.map(pop => (
                                <m.div
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
                                    <span aria-hidden="true"
                                        className="material-symbols-outlined text-xl"
                                        style={{ color: pop.color, marginLeft: '-0.5em', marginTop: '-0.5em', display: 'block' }}
                                    >
                                        {pop.icon}
                                    </span>
                                </m.div>
                            ))}
                        </div>
                    </m.div>

                    <m.div
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
                            const newYesPops = Array.from({ length: 8 }).map(() => ({
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
                            <span aria-hidden="true" className="material-symbols-outlined text-accent-purple text-xl">magic_button</span>
                            <span className="font-fredoka text-accent-purple text-xs font-bold tracking-widest uppercase">YES!</span>

                            {/* Pops originating from YES button */}
                            {yesPops.map(pop => (
                                <m.div
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
                                </m.div>
                            ))}
                        </div>
                    </m.div>
                </m.div>

                <m.div
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


                    {/* box-shadow now comes from the static .sticker-card CSS instead of being
                        recomputed from mouse position every frame - box-shadow isn't a
                        compositor-only property, so animating it forced a full repaint on
                        every pointer move and was a major contributor to the click-time jank. */}
                    <m.div
                        className="sticker-card sticker-card--flat rounded-[3rem] p-6 md:p-16 [@media(max-height:500px)]:p-3 text-center relative overflow-hidden flex flex-col items-center w-full"
                    >

                        <div className="mb-6 lg:mb-4 [@media(max-height:500px)]:mb-1 flex justify-center relative select-none">
                            <div className="relative z-50">
                                <m.div
                                    whileTap={{ scale: 0.9 }}
                                    animate={{
                                        scale: isHolding ? 0.95 : 1,
                                        rotate: heat > 30 ? SHAKE_ANIMATION : 0,
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    onPointerDown={handlePress}
                                    onPointerUp={handleRelease}
                                    onPointerLeave={handleRelease}
                                    onPointerCancel={handleRelease}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="cursor-pointer relative z-20"
                                    style={{ translateZ: 50, touchAction: 'none' }}
                                >
                                    <m.div
                                        animate={{
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                        className="glossy-heart w-24 h-24 [@media(max-height:500px)]:w-14 [@media(max-height:500px)]:h-14 rounded-full flex items-center justify-center relative"
                                    >
                                        <span aria-hidden="true" className="material-symbols-outlined text-white text-5xl [@media(max-height:500px)]:text-3xl select-none">favorite</span>

                                        {/* Subtle Glow - clipped by its own rounded-full/overflow-hidden wrapper
                                            instead of living on .glossy-heart itself: animated transform +
                                            border-radius + overflow-hidden + CSS filter all on one element is a
                                            known mobile Safari flicker bug (the drop-shadow's clip gets
                                            re-rasterized every frame the scale animation ticks). Keeping the
                                            filter-bearing element unclipped fixes the flicker. */}
                                        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                                            <m.div
                                                className="absolute inset-0 bg-white/20 mix-blend-overlay"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: Math.min(heat / 200, 0.3) }}
                                            />
                                        </div>
                                    </m.div>
                                </m.div>
                            </div>

                            <m.div
                                initial={{ scale: 0, opacity: 0.6 }}
                                animate={{ scale: 2.2, opacity: 0 }}
                                transition={{ duration: 0.9, ease: "easeOut", delay: 0.5 }}
                                className="absolute -inset-4 rounded-full pointer-events-none"
                                style={{ background: 'radial-gradient(closest-side, rgba(192, 132, 252, 0.4) 30%, rgba(192, 132, 252, 0) 100%)' }}
                            />
                        </div>

                        <m.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                        >
                            <m.h1
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                                className="text-3xl max-[359px]:text-[1.7rem] md:text-6xl [@media(max-height:500px)]:text-2xl font-['Fredoka'] font-bold text-[#ff4d7d] leading-tight mb-6 [@media(max-height:500px)]:mb-1 tracking-tight whitespace-pre-line"
                                style={{ willChange: "transform", fontWeight: 700, translateZ: 40 }}
                            >
                                {phrase.title}
                            </m.h1>
                        </m.div>

                        <m.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        >
                            <m.p
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.6 }}
                                className="text-xl md:text-3xl [@media(max-height:500px)]:text-base text-pink-500/80 font-['Pacifico'] italic"
                                style={{ willChange: "transform", translateZ: 30 }}
                            >
                                {phrase.subtitle}
                            </m.p>
                        </m.div>

                        <m.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            className="mt-16 [@media(max-height:500px)]:mt-3 flex justify-center gap-4"
                            style={{ translateZ: 15 }}
                        >
                            <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
                            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                            <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                        </m.div>
                    </m.div>



                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 100 }}>
                        {popHearts.map(heart => (
                            <m.div
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
                                    translateZ: 60,
                                }}
                            >
                                <span aria-hidden="true"
                                    className="material-symbols-outlined text-3xl"
                                    style={{ color: heart.color }}
                                >
                                    favorite
                                </span>
                            </m.div>
                        ))}
                    </div>
                </m.div>
            </main>


            <m.div
                style={{ x: layer4X, y: layer4Y }}
                aria-hidden="true" className="fixed inset-[-15%] pointer-events-none z-30"
            >
                {/* Faint colour haze. Was two huge icon glyphs under `blur`; soft gradients look the same
                    at this opacity without a filter layer being re-computed while the parallax moves. */}
                <div
                    className="absolute top-[10%] right-[15%] w-[240px] h-[240px]"
                    style={{ background: 'radial-gradient(closest-side, rgba(244, 114, 182, 0.09), rgba(244, 114, 182, 0))' }}
                />
                <div
                    className="absolute bottom-[5%] left-[5%] w-[340px] h-[340px]"
                    style={{ background: 'radial-gradient(closest-side, rgba(192, 132, 252, 0.05), rgba(192, 132, 252, 0))' }}
                />
            </m.div>

            <div aria-hidden="true" className="fixed bottom-8 md:bottom-12 left-0 w-full z-40 text-center pointer-events-none">
                <m.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 0.5, y: 0 }}
                    transition={{ delay: 1.5, duration: 1.2 }}
                    className="text-sm font-display font-bold tracking-[0.3em] text-[#881337] uppercase"
                >
                    Now let’s make it special
                </m.p>
            </div>
        </m.div >
    );
});

Celebration.displayName = 'Celebration';

export default Celebration;
