import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { publicRpc } from '../lib/publicRpc';
import { m, animate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useFloatingElements } from '../hooks/useFloatingElements';
import FloatingParticles from '../components/FloatingParticles';
import { logger } from '../lib/logger';
import { usePageTitle } from '../hooks/usePageTitle';
import { isCoarsePointer } from '../lib/device';


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
    "This isn’t over.", "Fine. I see how it is...😔", "Please....🥺🥺", "Please....🥺🥺🥺"
];

// Supabase RPCs resolve with { error } instead of throwing, so a plain try/catch never sees
// a failed write. "Yes" is the one event the sender is waiting on, so give it a couple of
// retries before giving up rather than losing it to a single dropped request.
const trackYesWithRetry = async (token, attempts = 3) => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const { error } = await publicRpc('track_yes', { url_token: token });
            if (!error) return;
            logger.error('Error tracking yes:', error);
        } catch (error) {
            logger.error('Error tracking yes:', error);
        }
        if (attempt < attempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
};

// How long after a "No" click a "Yes" click is ignored - a little longer than the No button's
// slide (300ms) so accidental taps on its moving target can't be read as an answer.
const YES_GUARD_MS = 450;

const PROPOSAL_SUBTITLES = [
    "Because my world feels brighter with you in it!",
    "You're the missing piece to my puzzle.",
    "Life is just better when we're together.",
    "I can't imagine my journey without you.",
    "You make every ordinary moment extraordinary.",
    "My heart chose you, and it never left.",
    "You are my favorite notification."
];

const Proposal = React.forwardRef(({ onTransition }, ref) => {
    usePageTitle('For You');
    const { setStep } = useApp();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [noCount, setNoCount] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [isEntryComplete, setIsEntryComplete] = useState(false);
    const [noButtonPos, setNoButtonPos] = useState({ x: 0, y: 0, rotate: 0 });
    const [hasEscaped, setHasEscaped] = useState(false);
    const hasEscapedRef = useRef(false);
    const lastNoClickAt = useRef(-Infinity);
    // The Yes button re-centres when the No button leaves the row. These drive a one-off glide
    // for that move (see the layout effect below) instead of letting it snap.
    const yesGlideX = useMotionValue(0);
    const yesGlideY = useMotionValue(0);
    const yesOffsetBeforeEscape = useRef(null);
    const yesGlideControls = useRef([]);
    const [explosions, setExplosions] = useState([]);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Initialize immediately so we never flash the valentine page for invalid/missing tokens
    const [isInvalid, setIsInvalid] = useState(() => !token);

    const noRef = useRef(null);
    const cardRef = useRef(null);
    const yesRef = useRef(null);

    const visitTracked = useRef(false);

    // Track page visit analytics
    useEffect(() => {
        if (!token || visitTracked.current) {
            return;
        }

        visitTracked.current = true;

        const trackVisit = async () => {
            try {
                // 1. Check if token exists
                const { data: exists, error: checkError } = await publicRpc('check_invite_exists', { url_token: token });

                if (checkError || !exists) {
                    setIsInvalid(true);
                    return;
                }

                // 2. Track visit securely
                await publicRpc('track_visit', { url_token: token });

            } catch (error) {
                logger.error('Error tracking visit:', error);
                setIsInvalid(true); // Treat error as invalid for safety
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

    // Touch screens: the page fades in under the colour wipe instead of being revealed by an animated
    // clip-path (see the root element below). Decided once at mount.
    const [fadeReveal] = useState(isCoarsePointer);

    // Trimmed from 15/12 to 10/8 - visually near-identical ambient density at noticeably lower cost.
    // Phones get fewer still: every particle is its own GPU layer, and too many of them made
    // mobile browsers drop tiles (flicker).
    const elements = useFloatingElements({
        heartCount: fadeReveal ? 7 : 10,
        sparkleCount: fadeReveal ? 5 : 8,
        heartColor: '#ec4899',
    });



    const handleYes = useCallback(async () => {
        if (isSending) return;

        // Mashing "No" means tapping where the button WAS a moment ago, while it is still sliding
        // away (its path can even cross Yes). Those late taps used to land on Yes and permanently
        // record an answer the recipient never meant to give. Ignore Yes for a moment after any No.
        if (performance.now() - lastNoClickAt.current < YES_GUARD_MS) return;

        setIsSending(true);

        // Silently save to database in background via secure RPC
        if (token) trackYesWithRetry(token);

        // Immediately trigger the circular transition
        onTransition(() => setStep('celebration'));

    }, [isSending, token, onTransition, setStep]);


    const moveNoButton = useCallback(() => {
        if (!cardRef.current || !noRef.current || !yesRef.current) return;

        const cardRect = cardRef.current.getBoundingClientRect();
        const yesRect = yesRef.current.getBoundingClientRect();

        const buttonWidth = noRef.current.offsetWidth;
        const buttonHeight = noRef.current.offsetHeight;

        // The button is tilted by a random +-10deg. A tilted box is taller/wider than its layout
        // box (a 380px-wide label gains ~65px of height), and the old placement ignored that, so a
        // tilted corner could poke onto the Yes button or past the card edge. Choose the tilt
        // first and reserve the extra room on every side.
        const rotate = Math.random() * 20 - 10;
        const radians = (Math.abs(rotate) * Math.PI) / 180;
        const tiltedWidth = buttonWidth * Math.cos(radians) + buttonHeight * Math.sin(radians);
        const tiltedHeight = buttonWidth * Math.sin(radians) + buttonHeight * Math.cos(radians);
        const insetX = (tiltedWidth - buttonWidth) / 2;
        const insetY = (tiltedHeight - buttonHeight) / 2;

        const padding = 20;
        const searchAttempts = 50;
        const safeDistance = 15;

        // Subtract the in-progress glide offset so this is where Yes will END UP, not wherever
        // it happens to be mid-glide - otherwise No could be placed where Yes is about to arrive.
        const yesLeft = yesRect.left - yesGlideX.get();
        const yesTop = yesRect.top - yesGlideY.get();
        const yesRel = {
            top: yesTop - cardRect.top,
            left: yesLeft - cardRect.left,
            right: (yesLeft - cardRect.left) + yesRect.width,
            bottom: (yesTop - cardRect.top) + yesRect.height
        };

        let bestX = 0;
        let bestY = 0;
        let found = false;

        // Range for the (untilted) box's top-left so the TILTED box stays inside the card.
        const minX = padding + insetX;
        const minY = padding + insetY;
        const maxX = Math.max(minX, cardRect.width - buttonWidth - padding - insetX);
        const maxY = Math.max(minY, cardRect.height - buttonHeight - padding - insetY);

        for (let i = 0; i < searchAttempts; i++) {
            const x = minX + Math.random() * (maxX - minX);
            const y = minY + Math.random() * (maxY - minY);

            // Compare using the tilted bounding box.
            const noRel = {
                top: y - insetY,
                left: x - insetX,
                right: x + buttonWidth + insetX,
                bottom: y + buttonHeight + insetY
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
            // No free spot: tuck into the card corner farthest from Yes.
            if (yesRel.top < cardRect.height / 2) {
                bestX = maxX;
                bestY = maxY;
            } else {
                bestX = minX;
                bestY = minY;
            }
        }

        setNoButtonPos({ x: bestX, y: bestY, rotate });
    }, [yesGlideX, yesGlideY]);

    // After a resize / device rotation the card can shrink under an already-escaped No button,
    // leaving it hanging outside the card (or unreachable). Pull it back inside, but only when
    // it is actually out of bounds - re-randomising on every resize would make the button jump
    // each time a mobile browser's address bar collapses.
    const clampNoButton = useCallback(() => {
        if (!cardRef.current || !noRef.current) return;
        const maxX = Math.max(0, cardRef.current.offsetWidth - noRef.current.offsetWidth - 20);
        const maxY = Math.max(0, cardRef.current.offsetHeight - noRef.current.offsetHeight - 20);
        setNoButtonPos(prev => (
            prev.x > maxX || prev.y > maxY
                ? { ...prev, x: Math.min(prev.x, maxX), y: Math.min(prev.y, maxY) }
                : prev
        ));
    }, []);

    const handleNo = useCallback(async () => {
        lastNoClickAt.current = performance.now();
        setNoCount(prev => prev + 1);

        if (!hasEscapedRef.current) {
            hasEscapedRef.current = true;

            // Layout-based offsets (unlike getBoundingClientRect) ignore the card's 3D tilt and
            // any in-flight transforms, so before/after are directly comparable.
            const yesEl = yesRef.current;
            if (yesEl) yesOffsetBeforeEscape.current = { x: yesEl.offsetLeft, y: yesEl.offsetTop };

            // The first escape used to be an instant teleport: the button switches from normal
            // flow (position: relative, left: auto) to position: absolute, and CSS can't
            // transition between those, so only the 2nd click onwards (number -> number) slid.
            // Pin it to exactly where it sits now first, then pick the real target a couple of
            // frames later so left/top animate from here to there like every later jump.
            const noEl = noRef.current;
            const cardEl = cardRef.current;
            if (noEl && cardEl) {
                const exact = noEl.offsetParent === cardEl;
                const n = noEl.getBoundingClientRect();
                const c = cardEl.getBoundingClientRect();
                setNoButtonPos({
                    x: exact ? noEl.offsetLeft : n.left - c.left,
                    y: exact ? noEl.offsetTop : n.top - c.top,
                    rotate: 3
                });
            }
            setHasEscaped(true);
            requestAnimationFrame(() => requestAnimationFrame(moveNoButton));
        }
        // Later clicks are repositioned from the layout effect below, AFTER React has rendered the
        // new (longer) label. Doing it here measured the OLD label's size, so every phrase that was
        // wider or wrapped to two lines grew after being placed and could end up on top of Yes.

        // Track "No" click in database via secure RPC
        if (token) {
            try {
                const { error } = await publicRpc('track_no', { url_token: token });
                if (error) logger.error('Error tracking No click:', error);
            } catch (error) {
                logger.error('Error tracking No click:', error);
            }
        }
    }, [moveNoButton, token]);

    // Pick the next hiding spot once the new label is in the DOM (runs before paint, so there is no
    // frame where the button sits at its old spot with its new text). The very first escape is
    // handled in handleNo, which has to pin the button in place before it can animate.
    useLayoutEffect(() => {
        if (noCount >= 2) moveNoButton();
    }, [noCount, moveNoButton]);

    // When the No button leaves the row (position: absolute) the flex row re-centres Yes. Do that
    // move as a glide: this runs after React commits but BEFORE the browser paints, so measure
    // where Yes landed, start it at its old spot with a transform, and ease the transform to 0.
    // (Framer's `layout` prop was tried first, but it misjudged the starting point inside the
    // card's 3D tilt - Yes flashed at its final position, then jumped back and glided.)
    useLayoutEffect(() => {
        const before = yesOffsetBeforeEscape.current;
        const yesEl = yesRef.current;
        if (!hasEscaped || !before || !yesEl) return;
        yesOffsetBeforeEscape.current = null;

        const dx = before.x - yesEl.offsetLeft;
        const dy = before.y - yesEl.offsetTop;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

        yesGlideX.set(dx);
        yesGlideY.set(dy);
        const options = { duration: prefersReducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] };
        yesGlideControls.current = [
            animate(yesGlideX, 0, options),
            animate(yesGlideY, 0, options)
        ];
    }, [hasEscaped, prefersReducedMotion, yesGlideX, yesGlideY]);

    useEffect(() => {
        const controls = yesGlideControls;
        return () => controls.current.forEach(c => c.stop());
    }, []);

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
        const handleResize = () => {
            checkMobile();
            clampNoButton();
        };
        window.addEventListener('resize', handleResize);

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = () => setPrefersReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', handler);

        return () => {
            mediaQuery.removeEventListener('change', handler);
            window.removeEventListener('resize', handleResize);
        };
    }, [clampNoButton]);

    const getNoButtonText = () => {
        return NO_PHRASES[Math.min(noCount, NO_PHRASES.length - 1)];
    };

    const [subtitle] = useState(() => PROPOSAL_SUBTITLES[Math.floor(Math.random() * PROPOSAL_SUBTITLES.length)]);

    const [zIndex, setZIndex] = useState(70);
    const zIndexTimer = useRef(null);
    useEffect(() => () => clearTimeout(zIndexTimer.current), []);

    return (
        <div className="relative min-h-screen">
            <m.div
                ref={ref}
                // Desktop: the page opens out of the middle of the colour wipe (clip-path). Animating
                // clip-path over a whole animated page re-paints it every frame, which flickered on
                // phones, so touch screens fade the page in over the wipe instead (same timing).
                initial={fadeReveal ? { opacity: 0 } : { clipPath: "circle(0% at 50% 50%)" }}
                animate={fadeReveal ? { opacity: 1 } : { clipPath: "circle(150% at 50% 50%)" }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }} // Keep instant exit for when we go to Celebration
                transition={{
                    duration: 1.5,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0
                }}
                onAnimationComplete={() => {
                    setIsEntryComplete(true);
                    clearTimeout(zIndexTimer.current);
                    zIndexTimer.current = setTimeout(() => setZIndex(50), 1000);
                }}
                className="bg-gradient-mesh font-['Quicksand'] min-h-screen overflow-hidden flex items-center justify-center p-4 [@media(max-height:500px)]:p-2 relative"
                style={{ perspective: 1000, zIndex }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Shared Background Elements */}
                <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <FloatingParticles elements={elements} prefersReducedMotion={prefersReducedMotion} heartVariant="filled" />
                </div>

                <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="floating-orb absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-300 opacity-40"></div>
                    <div className="floating-orb absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 opacity-40" style={{ animationDelay: '-5s' }}></div>
                    <div className="floating-orb absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-100 opacity-30" style={{ animationDelay: '-2s' }}></div>
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 }}></div>
                </div>

                <div aria-hidden="true" className="fixed top-12 left-12 rotate-12 opacity-80 z-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-pink-400 text-6xl">flare</span>
                </div>
                <div aria-hidden="true" className="fixed top-1/4 right-20 -rotate-12 opacity-80 z-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-purple-400 text-5xl">auto_awesome</span>
                </div>
                <div aria-hidden="true" className="fixed bottom-20 left-1/4 rotate-6 opacity-80 z-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-pink-300 text-7xl">favorite</span>
                </div>
                <div aria-hidden="true" className="fixed top-10 right-1/3 opacity-60 z-0">
                    <span aria-hidden="true" className="material-symbols-outlined text-rose-300 text-4xl">celebration</span>
                </div>

                {/* Content Switcher */}
                {isInvalid ? (
                    <main className="min-h-screen flex items-center justify-center cursor-none relative z-10 p-4">

                        <div className="sticker-card rounded-[3rem] p-8 md:p-12 text-center max-w-md w-full relative z-10 shadow-2xl">
                            <div className="mb-6 relative inline-block">
                                <m.span
                                    animate={{ y: [0, -2, 0] }}
                                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                                    style={{ willChange: "transform", display: "inline-block" }}
                                    className="material-symbols-outlined text-8xl text-gray-300"
                                    aria-hidden="true"
                                >
                                    broken_image
                                </m.span>
                                <span
                                    style={{ transform: "rotate(20deg)", display: "inline-block" }}
                                    className="material-symbols-outlined text-4xl text-pink-400 absolute -bottom-0 -right-2"
                                    aria-hidden="true"
                                >
                                    heart_broken
                                </span>
                            </div>
                            <m.h1
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.2 }}
                                style={{ translateZ: 40, willChange: "transform" }}
                                className="font-['Fredoka'] text-3xl md:text-4xl font-bold text-gray-700 mb-3"
                            >
                                Oops! Invalid Link
                            </m.h1>
                            <m.p
                                className="font-['Quicksand'] text-gray-500 font-semibold text-lg mb-8 leading-relaxed"
                            >
                                This proposal URL seems to be broken, expired, or deleted.
                            </m.p>
                        </div>
                        {/* Background decoration for Invalid State */}
                        <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0">
                            <span aria-hidden="true" className="material-symbols-outlined absolute top-20 left-20 text-gray-200 text-6xl rotate-12">sentiment_dissatisfied</span>
                            <span aria-hidden="true" className="material-symbols-outlined absolute bottom-20 right-20 text-gray-200 text-8xl -rotate-12">link_off</span>
                        </div>
                    </main>
                ) : (
                    <main className="relative z-10 w-full max-w-lg lg:max-w-2xl px-4" style={{ perspective: 1000 }}>
                        <m.div
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
                            className="sticker-card sticker-card--flat rounded-[3rem] pt-8 pb-5 px-5 md:pt-10 md:pb-6 md:px-6 [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-3 text-center relative overflow-visible"
                        >
                            <div className="absolute -top-6 -left-4 transform -rotate-[45deg] drop-shadow-lg z-20" style={{ transform: "translateZ(30px) rotate(-45deg)" }}>
                                <span aria-hidden="true" className="material-symbols-outlined text-7xl text-[#ff85a1]">redeem</span>
                            </div>

                            <div className="mb-6 lg:mb-4 [@media(max-height:500px)]:mb-2 flex justify-center">
                                <m.div
                                    className="z-50"
                                    style={{ translateZ: 50 }}
                                    variants={{
                                        hidden: { scale: 0, opacity: 0 },
                                        visible: { scale: 1, opacity: 1, transition: { type: "spring", duration: 1.2, bounce: 0.5 } } // Added explicit spring to heart
                                    }}
                                >
                                    <m.div
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                        className="glossy-heart w-24 h-24 [@media(max-height:500px)]:w-14 [@media(max-height:500px)]:h-14 rounded-full flex items-center justify-center"
                                    >
                                        <span aria-hidden="true" className="material-symbols-outlined text-white text-5xl [@media(max-height:500px)]:text-3xl">favorite</span>
                                    </m.div>
                                </m.div>
                            </div>

                            <div className="space-y-4 md:space-y-5 lg:space-y-4 [@media(max-height:500px)]:space-y-1">
                                <m.div
                                    variants={{
                                        hidden: { y: 20, opacity: 0 },
                                        visible: { y: 0, opacity: 1, transition: { duration: 0.8 } } // Slower
                                    }}
                                >

                                    <m.h1
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                                        style={{ willChange: "transform", fontWeight: 700, translateZ: 40 }}
                                        className="font-['Fredoka'] text-4xl max-[359px]:text-[2rem] md:text-6xl lg:text-6xl [@media(max-height:500px)]:text-3xl text-[#ff4d7d] tracking-tight leading-none"
                                    >
                                        Will you be my<br />Valentine ?
                                    </m.h1>
                                </m.div>
                                <m.div
                                    variants={{
                                        hidden: { y: 20, opacity: 0 },
                                        visible: { y: 0, opacity: 1, transition: { duration: 0.8 } } // Slower
                                    }}
                                >
                                    <m.p
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 3.5,
                                            ease: "easeInOut",
                                            delay: 0.6
                                        }}
                                        style={{ willChange: "transform", translateZ: 30 }}
                                        className="font-['Pacifico'] text-lg md:text-3xl [@media(max-height:500px)]:text-base text-pink-500/80 -rotate-1"
                                    >
                                        {subtitle}
                                    </m.p>
                                </m.div>
                            </div>

                                                            <m.div
                                    className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 mt-6 md:mt-10 lg:mt-8 [@media(max-height:500px)]:mt-2 px-4 min-h-[100px] lg:min-h-[90px] [@media(max-height:500px)]:min-h-[64px]"
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
                                    {/* Deliberately NOT positioned: the Yes button's offsetLeft/offsetTop must keep
                                        resolving against the card, which is what the glide measures. */}
                                    <m.div style={{ x: yesGlideX, y: yesGlideY }}>
                                    <m.button
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
                                        className="bubbly-yes group relative px-7 py-3 md:px-12 md:py-6 rounded-[2.5rem] text-lg md:text-2xl font-['Fredoka'] text-white uppercase tracking-wider !transition-none z-50 touch-manipulation"
                                    >
                                        <span className="relative z-10 flex items-center gap-3 font-['Fredoka'] font-semibold">
                                            YES!
                                            <span aria-hidden="true" className="material-symbols-outlined text-4xl">favorite</span>
                                        </span>
                                        <span aria-hidden="true" className="absolute top-1.5 right-3 material-symbols-outlined text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity">auto_fix_high</span>
                                    </m.button>
                                    </m.div>

                                    <m.button
                                        ref={noRef}
                                        onClick={handleNo}
                                        initial={false}
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 30
                                        }}
                                        animate={{
                                            rotate: hasEscaped ? noButtonPos.rotate : 3,
                                            scale: noCount > 15 ? 0.6 : noCount > 10 ? 0.75 : 1
                                        }}
                                        style={{
                                            position: hasEscaped ? "absolute" : "relative",
                                            left: hasEscaped ? noButtonPos.x : "auto",
                                            top: hasEscaped ? noButtonPos.y : "auto",
                                            // Size must not depend on where the button lands: an absolutely
                                            // positioned box shrink-wraps to the space left of its `left`, so
                                            // a long label wrapped differently at every position and the box
                                            // measured when choosing a spot was not the box that appeared.
                                            width: hasEscaped ? "max-content" : undefined,
                                            maxWidth: hasEscaped ? "calc(100% - 40px)" : undefined,
                                            zIndex: hasEscaped ? 60 : 0,
                                            transform: hasEscaped ? "translateZ(80px)" : "translateZ(50px)"
                                        }}
                                        className="sticker-no px-6 py-2 md:px-8 md:py-3 rounded-2xl text-lg md:text-xl font-bold text-pink-600 hover:bg-pink-50 transition-all duration-300 cursor-pointer"
                                    >
                                        {noCount === 0 ? "No..." : getNoButtonText()}
                                    </m.button>
                                </m.div>
                            
                            {explosions.length > 0 && (
                                <div className="absolute inset-0 pointer-events-none z-30">
                                    {explosions.map((particle, i) => (
                                        <m.span
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
                                        </m.span>
                                    ))}
                                </div>
                            )}

                            <m.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5, duration: 1 }}
                                className="mt-8 [@media(max-height:500px)]:mt-2 text-pink-400/70 font-['Quicksand'] text-sm font-semibold italic"
                            >
                                Hint: The {"\""}No{"\""} button is a bit shy... 😉
                            </m.p>


                            <div className="absolute top-1/4 right-4" style={{ transform: "translateZ(20px)" }}>
                                <span aria-hidden="true" className="material-symbols-outlined text-yellow-300 text-3xl animate-pulse">star</span>
                            </div>
                            <div className="absolute bottom-1/4 left-4" style={{ transform: "translateZ(20px)" }}>
                                <span aria-hidden="true" className="material-symbols-outlined text-yellow-300 text-2xl animate-pulse" style={{ animationDelay: '1s' }}>star</span>
                            </div>
                        </m.div>
                    </main >
                )}

                {/* Shared overlays */}
                <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-20">
                    <span aria-hidden="true" className="material-symbols-outlined absolute bottom-[10%] left-[5%] text-yellow-200/50 scale-125">auto_awesome</span>
                    <span aria-hidden="true" className="material-symbols-outlined absolute bottom-[20%] right-[15%] text-rose-200/50 scale-150">favorite</span>
                </div>
            </m.div >

            {/* Removed shockwave overlay completely */}
        </div>
    );
});

Proposal.displayName = 'Proposal';

export default Proposal;
