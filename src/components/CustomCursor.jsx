import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import heartCursor from '../assets/cursors/heart-cursor.png';
import pointerCursor from '../assets/cursors/pointer-cursor.png';

// Trail "worm" - each line chases the point ahead of it with simple lerp easing.
// Rendered via direct DOM attribute writes inside a single requestAnimationFrame loop
// instead of one GSAP tween-with-JS-modifier per line (previously 50 tweens x 2 axis
// callbacks = up to 100 JS callback invocations every frame). This is the biggest single
// perf win in the app since CustomCursor is mounted for the whole proposal/celebration flow.
const TRAIL_LENGTH = 24;
const TRAIL_EASE = 0.5;
const REVEAL_MS = 500;

const CustomCursor = () => {
    const [isTouch, setIsTouch] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);
    const lineRefs = useRef([]);

    useEffect(() => {
        const checkTouch = () => setIsTouch(window.matchMedia('(pointer: coarse)').matches);
        checkTouch();
        window.addEventListener('resize', checkTouch);

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);
        const motionHandler = () => setPrefersReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', motionHandler);

        return () => {
            window.removeEventListener('resize', checkTouch);
            mediaQuery.removeEventListener('change', motionHandler);
        };
    }, []);

    useEffect(() => {
        if (isTouch) return undefined;

        const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const points = Array.from({ length: TRAIL_LENGTH }, () => ({ x: pointer.x, y: pointer.y }));
        let hasMoved = false;
        let revealStart = null;
        let hovering = false;
        let rafId = null;

        const onMouseMove = (e) => {
            // Trail follows slightly offset from the cursor icon for better visual alignment.
            pointer.x = e.clientX + 20;
            pointer.y = e.clientY + 18;
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
            hasMoved = true;

            // e.target is reliable here (the cursor overlay is pointer-events:none), so this
            // avoids calling document.elementFromPoint on every pixel of mouse movement -
            // that call forces a synchronous layout and was a major jank source.
            const target = e.target;
            const isClickable = !!(target && (
                target.matches?.('button, a, input, select, textarea, [role="button"]') ||
                target.closest?.('button, a, [role="button"]')
            ));
            if (isClickable !== hovering) {
                hovering = isClickable;
                setIsHovering(isClickable);
            }
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });

        if (!prefersReducedMotion) {
            const tick = (now) => {
                if (hasMoved) {
                    if (revealStart === null) revealStart = now;
                    const revealProgress = Math.min(1, (now - revealStart) / REVEAL_MS);

                    let leaderX = pointer.x;
                    let leaderY = pointer.y;
                    for (let i = 0; i < TRAIL_LENGTH; i++) {
                        const p = points[i];
                        p.x += (leaderX - p.x) * TRAIL_EASE;
                        p.y += (leaderY - p.y) * TRAIL_EASE;

                        const line = lineRefs.current[i];
                        if (line) {
                            line.setAttribute('x1', p.x);
                            line.setAttribute('y1', p.y);
                            line.setAttribute('x2', leaderX);
                            line.setAttribute('y2', leaderY);
                            line.style.opacity = ((TRAIL_LENGTH - i) / TRAIL_LENGTH) * revealProgress;
                        }

                        leaderX = p.x;
                        leaderY = p.y;
                    }
                }
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isTouch, prefersReducedMotion, cursorX, cursorY]);

    if (isTouch) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {!prefersReducedMotion && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {Array.from({ length: TRAIL_LENGTH }).map((_, i) => {
                        const light = 60 + (i / TRAIL_LENGTH) * 30; // 60% -> 90% lightness toward the tail
                        return (
                            <line
                                key={i}
                                ref={(el) => { lineRefs.current[i] = el; }}
                                stroke={`hsl(340, 100%, ${light}%)`}
                                strokeWidth={2}
                                style={{ opacity: 0 }}
                            />
                        );
                    })}
                </svg>
            )}

            {/* Main Cursor - rendered last to stay on top of the trail */}
            <motion.div
                style={{
                    translateX: cursorX,
                    translateY: cursorY,
                    x: "0%",
                    y: "0%"
                }}
                className="fixed top-0 left-0 will-change-transform z-50"
            >
                <motion.div
                    initial={false}
                    animate={{ scale: isHovering ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ filter: "drop-shadow(0 2px 5px rgba(255, 92, 141, 0.4)) brightness(1.2) saturate(2.8) hue-rotate(-5deg)" }}
                >
                    {isHovering ? (
                        // HOVER STATE: HEART CURSOR (Animated Pulse)
                        <motion.img
                            src={heartCursor}
                            alt="cursor"
                            className="w-10 h-10 object-contain -translate-x-1/2 -translate-y-full"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        />
                    ) : (
                        // DEFAULT STATE: POINTER CURSOR
                        <img
                            src={pointerCursor}
                            alt="pointer"
                            className="w-10 h-10 object-contain"
                        />
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default CustomCursor;
