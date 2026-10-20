import { useEffect, useRef, useState } from 'react';
import { m, useMotionValue } from 'framer-motion';
import heartCursor from '../assets/cursors/heart-cursor.png';
import gloveCursor from '../assets/cursors/glove-cursor.png';

// Trail "worm" - each line chases the point ahead of it with simple lerp easing.
// Rendered via direct DOM attribute writes inside a single requestAnimationFrame loop
// instead of one GSAP tween-with-JS-modifier per line (previously 50 tweens x 2 axis
// callbacks = up to 100 JS callback invocations every frame). This is the biggest single
// perf win in the app since CustomCursor is mounted for the whole proposal/celebration flow.
const TRAIL_LENGTH = 24;
const TRAIL_EASE = 0.5;
// Hard cap on how far any link of the trail may lag behind the one in front of it. Without
// it the tail length grew with pointer speed, so a quick flick drew a long straight pink line
// far away from the cursor. With it the trail is a short comet tail (TRAIL_LENGTH * this) at
// any speed.
const MAX_SEGMENT = 2.5;
const REVEAL_MS = 500;
// Once every trail point is within this many px (sub-pixel, invisible) of the pointer the worm has stopped moving,
// so the frame loop can sleep until the next mousemove instead of rewriting 24 SVG lines
// 60 times a second for a cursor that is sitting still.
const SETTLED_EPSILON = 0.25;

// Rendered size of both cursor images, and the point of each image that must sit exactly on the
// real pointer (measured from the artwork's opaque pixels, in the 40px render box):
//  - heart: the centre of the heart itself (the 128px art has empty space below the heart, so
//    the box centre would put the visible heart ~3px above where clicks land)
//  - glove: its fingertip, the rounded top-left of the shape
const CURSOR_SIZE = 40;
const HEART_HOTSPOT = { x: 20, y: 17.2 };
const GLOVE_HOTSPOT = { x: 4, y: 4 };

// Anything that behaves like a button for the "hover" cursor. `.cursor-pointer` covers the
// non-<button> click targets (e.g. the celebration page's tappable heart and badges).
const CLICKABLE_SELECTOR = 'button, a, select, summary, [role="button"], .cursor-pointer';
// Text entry: the custom cursor steps aside and the browser's own I-beam shows (see index.css),
// so people can place a caret precisely instead of aiming with a heart.
const TEXT_FIELD_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]), textarea, [contenteditable="true"]';

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
        let inWindow = true;
        let overTextField = false;
        let shown = true;
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

                // Keep the tail tight: never let a link trail further than MAX_SEGMENT.
                const lagX = p.x - leaderX;
                const lagY = p.y - leaderY;
                const lag = Math.hypot(lagX, lagY);
                if (lag > MAX_SEGMENT) {
                    p.x = leaderX + (lagX * MAX_SEGMENT) / lag;
                    p.y = leaderY + (lagY * MAX_SEGMENT) / lag;
                }

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

        // Visible only while the mouse is inside the window and not over a text field.
        const applyVisibility = () => {
            const next = inWindow && !overTextField;
            if (next !== shown && overlayRef.current) {
                shown = next;
                overlayRef.current.style.opacity = next ? '1' : '0';
            }
        };

        const classify = (target) => {
            overTextField = !!target?.closest?.(TEXT_FIELD_SELECTOR);
            setHover(!overTextField && !!target?.closest?.(CLICKABLE_SELECTOR));
            applyVisibility();
        };

        const onMouseMove = (e) => {
            // Both images are positioned by their hotspot (see CSS / JSX below), so the pointer
            // position IS the heart's centre / the glove's fingertip, and the trail anchors there.
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            lastX = e.clientX;
            lastY = e.clientY;
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
            inWindow = true;
            wake();

            // e.target is reliable here (the cursor overlay is pointer-events:none), so this
            // avoids calling document.elementFromPoint on every pixel of mouse movement -
            // that call forces a synchronous layout and was a major jank source.
            classify(e.target);
        };

        // The element under a stationary pointer can change without any mouse movement: a
        // button runs away after a click (the "No" button), a modal closes, the page scrolls.
        // Without a re-check the cursor stayed in its "hovering" shape over empty space.
        const refreshHover = () => {
            if (lastX === null) return;
            classify(document.elementFromPoint(lastX, lastY));
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
        const onLeave = () => {
            inWindow = false;
            applyVisibility();
        };

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
        <div ref={overlayRef} className="custom-cursor pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {!prefersReducedMotion && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                    {Array.from({ length: TRAIL_LENGTH }).map((_, i) => {
                        const light = 60 + (i / TRAIL_LENGTH) * 30; // 60% -> 90% lightness toward the tail
                        return (
                            <line
                                key={i}
                                ref={(el) => { lineRefs.current[i] = el; }}
                                stroke={`hsl(340, 100%, ${light}%)`}
                                strokeWidth={2}
                                strokeLinecap="round"
                                style={{ opacity: 0 }}
                            />
                        );
                    })}
                </svg>
            )}

            {/* Main cursor - rendered last to stay on top of the trail. The wrapper is a zero-size
                box sitting exactly on the pointer; each image is offset by its own hotspot. Both
                images stay mounted and cross-fade, so changing shape never remounts / flickers. */}
            <m.div
                style={{ x: cursorX, y: cursorY }}
                className="fixed top-0 left-0 will-change-transform"
            >
                <div className="cursor-shape" data-hover={isHovering}>
                    <img
                        src={heartCursor}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="cursor-img cursor-img-heart"
                        style={{ width: CURSOR_SIZE, height: CURSOR_SIZE, left: -HEART_HOTSPOT.x, top: -HEART_HOTSPOT.y }}
                    />
                    <img
                        src={gloveCursor}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="cursor-img cursor-img-glove"
                        style={{ width: CURSOR_SIZE, height: CURSOR_SIZE, left: -GLOVE_HOTSPOT.x, top: -GLOVE_HOTSPOT.y }}
                    />
                </div>
            </m.div>
        </div>
    );
};

export default CustomCursor;
