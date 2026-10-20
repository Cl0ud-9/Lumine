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
// Once every trail point is within this many px (sub-pixel, invisible) of the pointer the worm has stopped moving,
// so the frame loop can sleep until the next mousemove instead of rewriting 24 SVG lines
// 60 times a second for a cursor that is sitting still.
const SETTLED_EPSILON = 0.25;
// Anything that behaves like a button for the "hover" cursor. `.cursor-pointer` covers the
// non-<button> click targets (e.g. the celebration page's tappable heart and badges), which
// the old selector missed - they kept the plain cursor even though they are clickable.
const CLICKABLE_SELECTOR = 'button, a, input, select, textarea, label, summary, [role="button"], .cursor-pointer';

const CustomCursor = () => {
    const [isTouch, setIsTouch] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);
    const lineRefs = useRef([]);
    const overlayRef = useRef(null);

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
        let revealStart = null;
        let hovering = false;
        let visible = true;
        let lastX = null;
        let lastY = null;
        let rafId = null;
        let scrollRaf = null;
        const hoverTimers = [];
        const reduceTrail = prefersReducedMotion;

        const tick = (now) => {
            if (revealStart === null) revealStart = now;
            const revealProgress = Math.min(1, (now - revealStart) / REVEAL_MS);

            let leaderX = pointer.x;
            let leaderY = pointer.y;
            let maxDelta = 0;
            for (let i = 0; i < TRAIL_LENGTH; i++) {
                const p = points[i];
                const dx = leaderX - p.x;
                const dy = leaderY - p.y;
                p.x += dx * TRAIL_EASE;
                p.y += dy * TRAIL_EASE;
                maxDelta = Math.max(maxDelta, Math.abs(dx), Math.abs(dy));

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

            // Keep running while the trail is still converging or the fade-in is in progress.
            rafId = maxDelta > SETTLED_EPSILON || revealProgress < 1
                ? requestAnimationFrame(tick)
                : null;
        };

        const wake = () => {
            if (!reduceTrail && rafId === null) rafId = requestAnimationFrame(tick);
        };

        const setHover = (isClickable) => {
            if (isClickable !== hovering) {
                hovering = isClickable;
                setIsHovering(isClickable);
            }
        };

        const setVisible = (next) => {
            if (next !== visible && overlayRef.current) {
                visible = next;
                overlayRef.current.style.opacity = next ? '1' : '0';
            }
        };

        const onMouseMove = (e) => {
            // The heart is centred on the real pointer position (see the default <img> below),
            // so the trail anchors exactly there. It used to be drawn with its top-left corner
            // on the pointer, which put the visible heart ~20px down-right of where a click
            // actually landed.
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            lastX = e.clientX;
            lastY = e.clientY;
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
            setVisible(true);
            wake();

            // e.target is reliable here (the cursor overlay is pointer-events:none), so this
            // avoids calling document.elementFromPoint on every pixel of mouse movement -
            // that call forces a synchronous layout and was a major jank source.
            setHover(!!e.target?.closest?.(CLICKABLE_SELECTOR));
        };

        // The element under a stationary pointer can change without any mouse movement: a
        // button runs away after a click (the "No" button), a modal closes, the page scrolls.
        // Without a re-check the cursor stayed in its "hovering" shape over empty space.
        const refreshHover = () => {
            if (lastX === null) return;
            setHover(!!document.elementFromPoint(lastX, lastY)?.closest?.(CLICKABLE_SELECTOR));
        };

        const onClick = () => {
            // Re-check after the click's effects (and the No button's slide transition) land.
            hoverTimers.push(setTimeout(refreshHover, 80), setTimeout(refreshHover, 450));
        };

        const onScroll = () => {
            if (scrollRaf === null) {
                scrollRaf = requestAnimationFrame(() => {
                    scrollRaf = null;
                    refreshHover();
                });
            }
        };

        // Hide the cursor while the mouse is outside the window instead of leaving it frozen
        // at the last position it was seen.
        const onLeave = () => setVisible(false);

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('click', onClick, true);
        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        document.documentElement.addEventListener('mouseleave', onLeave);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('click', onClick, true);
            window.removeEventListener('scroll', onScroll, { capture: true });
            document.documentElement.removeEventListener('mouseleave', onLeave);
            hoverTimers.forEach(clearTimeout);
            if (rafId !== null) cancelAnimationFrame(rafId);
            if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
        };
    }, [isTouch, prefersReducedMotion, cursorX, cursorY]);

    if (isTouch) return null;

    return (
        <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-150">
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
                            alt=""
                            aria-hidden="true"
                            className="w-10 h-10 object-contain"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        />
                    ) : (
                        // DEFAULT STATE: centred on the pointer so the visible heart is where clicks land
                        <img
                            src={pointerCursor}
                            alt=""
                            aria-hidden="true"
                            className="w-10 h-10 object-contain -translate-x-1/2 -translate-y-1/2"
                        />
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default CustomCursor;
