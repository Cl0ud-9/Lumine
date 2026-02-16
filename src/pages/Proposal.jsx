import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { motion, LayoutGroup, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import CustomCursor from '../components/CustomCursor';

const NO_PHRASES = [
    "No…?", "Nope.", "Oh, come on.", "Really?", "You sure about that?",
    "Think again 😌", "That can’t be your final answer.", "Try clicking the other one.",
    "That felt like a misclick.", "We both know you didn’t mean that.", "Bold choice.",
    "Interesting strategy.", "Loading emotional damage 💔", "This is getting suspicious.",
    "Okay… now it’s personal.", "I prepared for this moment 😔", "That wasn’t in the script.",
    "You’re rewriting the storyline.", "The algorithm is confused.", "Heart.exe has stopped responding.",
    "Processing rejection…", "Confidence level: questionable.", "This feels illegal somehow.",
    "You’re committing to this, huh?", "At this point, it’s dedication.", "Stubbornness unlocked.",
    "Achievement earned: Cold Heart.", "Plot twist villain arc detected.", "The audacity is impressive.",
    "Fine. I respect the persistence.", "Still no?", "You’re enjoying this, aren’t you?",
    "This is becoming performance art.", "Okay, now I’m impressed.", "History will remember this moment.",
    "Destiny is patient, you know.", "Fate is watching 👀", "This is a saga now.",
    "You fear happiness.", "I admire the consistency.", "Still pressing it?",
    "We could’ve been cute.", "You’re testing my emotional bandwidth.", "Alright… I see how it is.",
    "Respectfully… why?", "You’re really committed to chaos.", "I’ll just wait here.",
    "This isn’t over.", "Fine. I see how it is...😔"
];

const PROPOSAL_SUBTITLES = [
    "Because my world feels brighter with you in it!",
    "You're the missing piece to my puzzle.",
    "Life is just better when we're together.",
    "I can't imagine my journey without you.",
    "You make every ordinary moment extraordinary.",
    "My heart chose you, and it never left.",
    "You are my favorite notification."
];

const SPARKLE_COLORS = ['#d8b4fe', '#f9a8d4', '#ffffff']; // Purple-300, Pink-300, White

const Proposal = React.forwardRef(({ onTransition }, ref) => {
    const { setStep } = useApp();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [noCount, setNoCount] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [isEntryComplete, setIsEntryComplete] = useState(false);
    const [noButtonPos, setNoButtonPos] = useState({ x: 0, y: 0, rotate: 0 });
    const [hasEscaped, setHasEscaped] = useState(false);
    const [explosions, setExplosions] = useState([]);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [isInvalid, setIsInvalid] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const noRef = useRef(null);
    const cardRef = useRef(null);
    const yesRef = useRef(null);

    const visitTracked = useRef(false);

    // Track page visit analytics
    useEffect(() => {
        if (!token || visitTracked.current) {
            if (!token) {
                setIsInvalid(true);
                setIsLoading(false);
            }
            return;
        }

        visitTracked.current = true;

        const trackVisit = async () => {
            try {
                // 1. Check if token exists
                const { data: exists, error: checkError } = await supabase.rpc('check_invite_exists', { url_token: token });

                if (checkError || !exists) {
                    setIsInvalid(true);
                    setIsLoading(false);
                    return;
                }

                // 2. Track visit securely
                await supabase.rpc('track_visit', { url_token: token });
                setIsLoading(false);

            } catch (error) {
                console.error('Error tracking visit:', error);
                setIsInvalid(true); // Treat error as invalid for safety
                setIsLoading(false);
            }
        };

        trackVisit();
    }, [token]);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [isMobile ? 0 : 7, isMobile ? 0 : -7]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [isMobile ? 0 : -7, isMobile ? 0 : 7]);

    const handleMouseMove = (e) => {
        if (isMobile) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const [elements] = useState(() => {
        const hearts = Array.from({ length: 15 }).map((_, i) => ({
            id: `heart-${i}`,
            type: 'heart',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 15 + Math.random() * 10,
            size: 20 + Math.random() * 30,
            rotate: Math.random() * 30 - 15,
            color: '#ec4899' // Pink-500 (darker) for better visibility
        }));

        const sparkles = Array.from({ length: 12 }).map((_, i) => ({
            id: `sparkle-${i}`,
            type: 'sparkle',
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 4 + Math.random() * 6,
            size: 15 + Math.random() * 20, // Slightly larger sparkles
            rotate: Math.random() * 180,
            color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
        }));
        return [...hearts, ...sparkles];
    });

    const [showShockwave, setShowShockwave] = useState(false);

    const handleYes = useCallback(async () => {
        if (isSending) return;

        setIsSending(true);
        setShowShockwave(true);

        // Silently save to database in background via secure RPC
        if (token) {
            supabase.rpc('track_yes', { url_token: token })
                .then(({ error }) => {
                    if (error) console.error('Error tracking yes:', error);
                });
        }

        // Immediately trigger the circular transition
        onTransition(() => setStep('celebration'));

    }, [isSending, token, onTransition, setStep]);


    const moveNoButton = useCallback(() => {
        if (!cardRef.current || !noRef.current || !yesRef.current) return;

        const cardRect = cardRef.current.getBoundingClientRect();
        const yesRect = yesRef.current.getBoundingClientRect();

        const buttonWidth = noRef.current.offsetWidth;
        const buttonHeight = noRef.current.offsetHeight;

        const padding = 20;
        const searchAttempts = 50;
        const safeDistance = 15;

        const yesRel = {
            top: yesRect.top - cardRect.top,
            left: yesRect.left - cardRect.left,
            right: (yesRect.left - cardRect.left) + yesRect.width,
            bottom: (yesRect.top - cardRect.top) + yesRect.height
        };

        let bestX = 0;
        let bestY = 0;
        let found = false;

        for (let i = 0; i < searchAttempts; i++) {
            const x = Math.random() * (cardRect.width - buttonWidth - padding * 2) + padding;
            const y = Math.random() * (cardRect.height - buttonHeight - padding * 2) + padding;

            const noRel = {
                top: y,
                left: x,
                right: x + buttonWidth,
                bottom: y + buttonHeight
            };

            const overlap = !(
                noRel.right < (yesRel.left - safeDistance) ||
                noRel.left > (yesRel.right + safeDistance) ||
                noRel.bottom < (yesRel.top - safeDistance) ||
                noRel.top > (yesRel.bottom + safeDistance)
            );

            if (!overlap) {
                bestX = x;
                bestY = y;
                found = true;
                break;
            }
        }

        if (!found) {
            if (yesRel.top < cardRect.height / 2) {
                bestX = cardRect.width - buttonWidth - padding;
                bestY = cardRect.height - buttonHeight - padding;
            } else {
                bestX = padding;
                bestY = padding;
            }
        }

        const rotate = Math.random() * 20 - 10;
        setNoButtonPos({ x: bestX, y: bestY, rotate });
    }, []);

    const handleNo = useCallback(async () => {
        setNoCount(prev => prev + 1);
        setHasEscaped(true);
        moveNoButton();

        // Track "No" click in database via secure RPC
        if (token) {
            try {
                await supabase.rpc('track_no', { url_token: token });
            } catch (error) {
                console.error('Error tracking No click:', error);
            }
        }
    }, [moveNoButton, token]);

    useEffect(() => {
        if (noCount === 13) {
            const particles = [...Array(15)].map(() => ({
                x: Math.random() * 300 - 150,
                y: Math.random() * 300 - 150,
                emoji: '💔'
            }));

            setExplosions(particles);

            const timer = setTimeout(() => {
                setExplosions([]);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [noCount]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.matchMedia("(pointer: coarse)").matches);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = () => setPrefersReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', handler);

        return () => {
            mediaQuery.removeEventListener('change', handler);
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const getNoButtonText = () => {
        return NO_PHRASES[Math.min(noCount, NO_PHRASES.length - 1)];
    };

    const [subtitle] = useState(() => PROPOSAL_SUBTITLES[Math.floor(Math.random() * PROPOSAL_SUBTITLES.length)]);

    const [zIndex, setZIndex] = useState(70);

    return (
        <div className="relative min-h-screen">
            <motion.div
                ref={ref}
                initial={{ clipPath: "circle(0% at 50% 50%)" }}
                animate={{ clipPath: "circle(150% at 50% 50%)" }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }} // Keep instant exit for when we go to Celebration
                transition={{
                    duration: 1.5,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0
                }}
                onAnimationComplete={() => {
                    setIsEntryComplete(true);
                    setTimeout(() => setZIndex(50), 1000);
                }}
                className="bg-gradient-mesh font-['Quicksand'] min-h-screen overflow-hidden flex items-center justify-center p-4 relative"
                style={{ perspective: 1000, zIndex }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Shared Background Elements */}
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    {elements.map((el) => (
                        <motion.div
                            key={el.id}
                            initial={{ y: "110vh", opacity: 0 }}
                            animate={{
                                y: "-10vh",
                                opacity: [0, el.type === 'heart' ? 0.8 : 0.9, 0]
                            }}
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
                            }}
                        >
                            {el.type === 'heart' ? (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-full h-full opacity-80 drop-shadow-sm"
                                    style={{ transform: `rotate(${el.rotate}deg)`, color: el.color }}
                                >
                                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.245 15.245 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                </svg>
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-full h-full animate-pulse drop-shadow-sm"
                                    style={{ transform: `rotate(${el.rotate}deg)`, color: el.color }}
                                >
                                    <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" />
                                </svg>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="floating-orb absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-300 opacity-40"></div>
                    <div className="floating-orb absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 opacity-40" style={{ animationDelay: '-5s' }}></div>
                    <div className="floating-orb absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-100 opacity-30" style={{ animationDelay: '-2s' }}></div>
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 }}></div>
                </div>

                <div className="fixed top-12 left-12 rotate-12 opacity-80 z-0">
                    <span className="material-symbols-outlined text-pink-400 text-6xl">flare</span>
                </div>
                <div className="fixed top-1/4 right-20 -rotate-12 opacity-80 z-0">
                    <span className="material-symbols-outlined text-purple-400 text-5xl">auto_awesome</span>
                </div>
                <div className="fixed bottom-20 left-1/4 rotate-6 opacity-80 z-0">
                    <span className="material-symbols-outlined text-pink-300 text-7xl">favorite</span>
                </div>
                <div className="fixed top-10 right-1/3 opacity-60 z-0">
                    <span className="material-symbols-outlined text-rose-300 text-4xl">celebration</span>
                </div>

                {/* Content Switcher */}
                {isInvalid ? (
                    <div className="min-h-screen flex items-center justify-center cursor-none relative z-10 p-4">
                        <CustomCursor />
                        <div className="sticker-card rounded-[3rem] p-8 md:p-12 text-center max-w-md w-full relative z-10 shadow-2xl">
                            <div className="mb-6 relative inline-block">
                                <span className="material-symbols-outlined text-8xl text-gray-300">broken_image</span>
                                <span className="material-symbols-outlined text-4xl text-pink-400 absolute -bottom-2 -right-2 animate-bounce">heart_broken</span>
                            </div>
                            <h1 className="font-['Fredoka'] text-3xl md:text-4xl font-bold text-gray-700 mb-3">
                                Oops! Invalid Link
                            </h1>
                            <p className="font-['Quicksand'] text-gray-500 font-semibold text-lg mb-8 leading-relaxed">
                                This proposal URL seems to be broken, expired, or deleted.
                            </p>
                        </div>
                        {/* Background decoration for Invalid State */}
                        <div className="fixed inset-0 pointer-events-none z-0">
                            <span className="material-symbols-outlined absolute top-20 left-20 text-gray-200 text-6xl rotate-12">sentiment_dissatisfied</span>
                            <span className="material-symbols-outlined absolute bottom-20 right-20 text-gray-200 text-8xl -rotate-12">link_off</span>
                        </div>
                    </div>
                ) : (
                    <main className="relative z-10 w-full max-w-lg lg:max-w-2xl px-4" style={{ perspective: 1000 }}>
                        <motion.div
                            ref={cardRef}
                            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                            variants={{
                                hidden: { opacity: 0, y: 50 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        duration: 0.8,
                                        delay: 0.8, // Add initial delay
                                        staggerChildren: 0.4
                                    }
                                },
                                exit: { opacity: 0, scale: 0.95 }
                            }}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="sticker-card rounded-[3rem] pt-8 pb-5 px-5 md:pt-10 md:pb-6 md:px-6 text-center relative overflow-visible"
                        >
                            <div className="absolute -top-6 -left-4 transform -rotate-[45deg] drop-shadow-lg z-20" style={{ transform: "translateZ(30px) rotate(-45deg)" }}>
                                <span className="material-symbols-outlined text-7xl text-[#ff85a1]">redeem</span>
                            </div>

                            <div className="mb-6 lg:mb-4 flex justify-center">
                                <motion.div
                                    layoutId="hero-heart"
                                    className="z-50"
                                    style={{ transform: "translateZ(50px)" }}
                                    variants={{
                                        hidden: { scale: 0, opacity: 0 },
                                        visible: { scale: 1, opacity: 1, transition: { type: "spring", duration: 1.2, bounce: 0.5 } } // Added explicit spring to heart
                                    }}
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                        className="glossy-heart w-24 h-24 rounded-full flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-white text-5xl">favorite</span>
                                    </motion.div>
                                </motion.div>
                            </div>

                            <div className="space-y-4 md:space-y-5 lg:space-y-4">
                                <motion.div
                                    variants={{
                                        hidden: { y: 20, opacity: 0 },
                                        visible: { y: 0, opacity: 1, transition: { duration: 0.8 } } // Slower
                                    }}
                                >

                                    <motion.h1
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                                        style={{ willChange: "transform", fontWeight: 700, transform: "translateZ(40px)" }}
                                        className="font-['Fredoka'] text-4xl md:text-6xl lg:text-6xl text-[#ff4d7d] tracking-tight leading-none"
                                    >
                                        Will you be my<br />Valentine ?
                                    </motion.h1>
                                </motion.div>
                                <motion.div
                                    variants={{
                                        hidden: { y: 20, opacity: 0 },
                                        visible: { y: 0, opacity: 1, transition: { duration: 0.8 } } // Slower
                                    }}
                                >
                                    <motion.p
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 3.5,
                                            ease: "easeInOut",
                                            delay: 0.6
                                        }}
                                        style={{ willChange: "transform", transform: "translateZ(30px)" }}
                                        className="font-['Pacifico'] text-lg md:text-3xl text-pink-500/80 -rotate-1"
                                    >
                                        {subtitle}
                                    </motion.p>
                                </motion.div>
                            </div>

                            <LayoutGroup>
                                <motion.div
                                    className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 mt-6 md:mt-10 lg:mt-8 px-4 min-h-[100px] lg:min-h-[90px]"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{
                                        opacity: isEntryComplete ? 1 : 0,
                                        scale: isEntryComplete ? 1 : 0.5
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 20,
                                        delay: 0.2
                                    }}
                                >
                                    <motion.button
                                        ref={yesRef}
                                        animate={{
                                            scale: hasEscaped ? 1.06 : 1,
                                            y: hasEscaped ? -2 : 0
                                        }}
                                        transition={{
                                            type: "tween",
                                            duration: 0.55,
                                            ease: [0.22, 1, 0.36, 1]
                                        }}
                                        onClick={handleYes}
                                        disabled={isSending || !isEntryComplete}
                                        style={{ transform: "translateZ(50px)" }}
                                        className="bubbly-yes group relative px-7 py-3 md:px-12 md:py-6 rounded-[2.5rem] text-lg md:text-2xl font-['Fredoka'] text-white uppercase tracking-wider transition-transform active:scale-95 z-50"
                                    >
                                        <span className="relative z-10 flex items-center gap-3 font-['Fredoka'] font-semibold">
                                            YES!
                                            <span className="material-symbols-outlined text-4xl">favorite</span>
                                        </span>
                                        <span className="absolute -top-4 -right-4 material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity">auto_fix_high</span>
                                    </motion.button>

                                    <motion.button
                                        ref={noRef}
                                        onClick={handleNo}
                                        initial={false}
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 30
                                        }}
                                        animate={{
                                            rotate: hasEscaped ? noButtonPos.rotate : 3
                                        }}
                                        style={{
                                            position: hasEscaped ? "absolute" : "relative",
                                            left: hasEscaped ? noButtonPos.x : "auto",
                                            top: hasEscaped ? noButtonPos.y : "auto",
                                            zIndex: hasEscaped ? 60 : 0,
                                            transform: hasEscaped ? "translateZ(80px)" : "translateZ(50px)"
                                        }}
                                        className={`sticker-no px-6 py-2 md:px-8 md:py-3 rounded-2xl text-lg md:text-xl font-bold text-pink-400 hover:bg-pink-50 transition-all duration-300 cursor-pointer
                                    ${noCount > 15
                                                ? "scale-60"
                                                : noCount > 10
                                                    ? "scale-75"
                                                    : ""
                                            }
`}
                                    >
                                        {noCount === 0 ? "No..." : getNoButtonText()}
                                    </motion.button>
                                </motion.div>
                            </LayoutGroup>

                            {explosions.length > 0 && (
                                <div className="absolute inset-0 pointer-events-none z-30">
                                    {explosions.map((particle, i) => (
                                        <motion.span
                                            key={i}
                                            initial={{ scale: particle.scale || 1, opacity: 1, rotate: particle.rotation || 0 }}
                                            animate={{
                                                scale: (particle.scale || 1) * 1.5,
                                                opacity: 0,
                                                x: particle.x,
                                                y: particle.y,
                                                rotate: (particle.rotation || 0) + 180
                                            }}
                                            transition={{ duration: 1 }}
                                            className="absolute text-2xl"
                                            style={{ top: "50%", left: "50%" }}
                                        >
                                            {particle.emoji || '💔'}
                                        </motion.span>
                                    ))}
                                </div>
                            )}

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5, duration: 1 }}
                                className="mt-8 text-pink-400/70 font-['Quicksand'] text-sm font-semibold italic"
                            >
                                Hint: The "No" button is a bit shy... 😉
                            </motion.p>


                            <div className="absolute top-1/4 right-4" style={{ transform: "translateZ(20px)" }}>
                                <span className="material-symbols-outlined text-yellow-300 text-3xl animate-pulse">star</span>
                            </div>
                            <div className="absolute bottom-1/4 left-4" style={{ transform: "translateZ(20px)" }}>
                                <span className="material-symbols-outlined text-yellow-300 text-2xl animate-pulse" style={{ animationDelay: '1s' }}>star</span>
                            </div>
                        </motion.div>
                    </main >
                )}

                {/* Shared overlays */}
                <div className="fixed inset-0 pointer-events-none z-20">
                    <span className="material-symbols-outlined absolute bottom-[10%] left-[5%] text-yellow-200/50 scale-125">auto_awesome</span>
                    <span className="material-symbols-outlined absolute bottom-[20%] right-[15%] text-rose-200/50 scale-150">favorite</span>
                </div>
            </motion.div >

// Removed shockwave overlay completely
        </div>
    );
});

Proposal.displayName = 'Proposal';

export default Proposal;
