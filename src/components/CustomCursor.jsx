import { useEffect, useRef, useState } from 'react';
import { m, useMotionValue } from 'framer-motion';
import heartCursor from '../assets/cursors/heart-cursor.png';
import gloveCursor from '../assets/cursors/glove-cursor.png';

// Trail "worm" - each segment chases the point ahead of it with simple lerp easing, drawn on ONE
// small canvas that follows the pointer. It used to be 24 SVG <line> elements whose attributes
// and opacity were rewritten ~120 times per frame; every write invalidates style/layout, which
// showed up as dropped frames while the mouse moved on the busier pages (celebration went from
// ~48fps to ~58fps with the trail removed). Canvas drawing touches no DOM at all.
const TRAIL_LENGTH = 24;
const TRAIL_EASE = 0.5;
// Hard cap on how far any link of the trail may lag behind the one in front of it. Without
// it the tail length grew with pointer speed, so a quick flick drew a long straight pink line
// far away from the cursor. With it the trail is a short comet tail (TRAIL_LENGTH * this) at
// any speed.
const MAX_SEGMENT = 2.5;
const REVEAL_MS = 500;
// Once every trail point is within this many px (sub-pixel, invisible) of the pointer the worm has stopped moving,
// so the frame loop can sleep until the next mousemove instead of redrawing
// 60 times a second for a cursor that is sitting still.
const SETTLED_EPSILON = 0.25;
// The canvas is a square centred on the pointer. The tail is at most TRAIL_LENGTH * MAX_SEGMENT
// (60px) long and starts up to ~12px from the pointer, so 160px (80 each side) always contains it.
const TRAIL_BOX = 160;
const TRAIL_STROKE = Array.from({ length: TRAIL_LENGTH }, (_, i) => `hsl(340, 100%, ${60 + (i / TRAIL_LENGTH) * 30}%)`); // 60% -> 90% lightness toward the tail

// Rendered size of both cursor images, and the point of each image that must sit exactly on the
// real pointer (measured from the artwork's opaque pixels, in the 40px render box):
//  - heart: the centre of the heart itself (the 128px art has empty space below the heart, so
//    the box centre would put the visible heart ~3px above where clicks land)
//  - glove: its fingertip, the rounded top-left of the shape
const CURSOR_SIZE = 40;
const HEART_HOTSPOT = { x: 20, y: 17.2 };
const GLOVE_HOTSPOT = { x: 4, y: 4 };

// Where the trail is anchored, relative to the pointer, for each shape: the visible CENTRE of the
// artwork, so the coloured tail always grows out from inside the cursor. For the heart that is the
// pointer itself (its hotspot is its centre). The glove's hotspot is its fingertip, which is on
// its edge, so anchoring there made the tail start outside the glove, off to its upper left; its
// body centre (13.1, 14.5 in the 40px box, scaled by the 1.08 hover pop) is the right anchor.
const HOVER_SCALE = 1.08;
const ANCHOR_HEART = { x: 0, y: 0 };
const ANCHOR_GLOVE = { x: (13.1 - GLOVE_HOTSPOT.x) * HOVER_SCALE, y: (14.5 - GLOVE_HOTSPOT.y) * HOVER_SCALE };
// How quickly the anchor eases between the two (per frame) when the shape changes, so the tail
// glides instead of jumping.
const ANCHOR_EASE = 0.3;

// Anything that behaves like a button for the "hover" cursor, including text fields (the glove
// is shown over inputs, as it always was). `.cursor-pointer` covers the non-<button> click
// targets (e.g. the celebration page's tappable heart and badges).
const CLICKABLE_SELECTOR = 'button, a, input, select, textarea, summary, [role="button"], .cursor-pointer';

const CustomCursor = () => {
    const [isTouch, setIsTouch] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);
    const trailRef = useRef(null);
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
        let shown = true;
        // Current (eased) trail anchor offset from the pointer - see ANCHOR_* above.
        const anchor = { x: ANCHOR_HEART.x, y: ANCHOR_HEART.y };
        let lastX = null;
        let lastY = null;
        let rafId = null;
        let scrollRaf = null;
        const hoverTimers = [];
        const reduceTrail = prefersReducedMotion;

        // ---- trail canvas (sharp on high-DPI screens)
        const canvas = trailRef.current;
        const ctx = canvas ? canvas.getContext('2d') : null;
        const setupCanvas = () => {
            if (!canvas || !ctx) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(TRAIL_BOX * dpr);
            canvas.height = Math.round(TRAIL_BOX * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        };
        setupCanvas();
        window.addEventListener('resize', setupCanvas);

        const tick = (now) => {
            if (revealStart === null) revealStart = now;
            const revealProgress = Math.min(1, (now - revealStart) / REVEAL_MS);

            // Ease the anchor towards the current shape's centre, then grow the tail from there.
            const target = hovering ? ANCHOR_GLOVE : ANCHOR_HEART;
            const anchorDx = target.x - anchor.x;
            const anchorDy = target.y - anchor.y;
            anchor.x += anchorDx * ANCHOR_EASE;
            anchor.y += anchorDy * ANCHOR_EASE;

            // The canvas is centred on the pointer; draw in its local coordinates.
            const originX = Math.round(pointer.x - TRAIL_BOX / 2);
            const originY = Math.round(pointer.y - TRAIL_BOX / 2);
            if (canvas && ctx) {
                canvas.style.transform = `translate3d(${originX}px, ${originY}px, 0)`;
                ctx.clearRect(0, 0, TRAIL_BOX, TRAIL_BOX);
            }

            let leaderX = pointer.x + anchor.x;
            let leaderY = pointer.y + anchor.y;
            let maxDelta = Math.max(Math.abs(anchorDx), Math.abs(anchorDy));
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

                if (ctx) {
                    ctx.globalAlpha = ((TRAIL_LENGTH - i) / TRAIL_LENGTH) * revealProgress;
                    ctx.strokeStyle = TRAIL_STROKE[i];
                    ctx.beginPath();
                    ctx.moveTo(p.x - originX, p.y - originY);
                    ctx.lineTo(leaderX - originX, leaderY - originY);
                    ctx.stroke();
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
                wake(); // the trail anchor has to ease to the new shape even if the mouse is still
            }
        };

        // Visible only while the mouse is inside the window.
        const applyVisibility = () => {
            if (inWindow !== shown && overlayRef.current) {
                shown = inWindow;
                overlayRef.current.style.opacity = inWindow ? '1' : '0';
            }
        };

        const classify = (target) => {
            setHover(!!target?.closest?.(CLICKABLE_SELECTOR));
            applyVisibility();
        };

        const onMouseMove = (e) => {
            // Both images are positioned by their hotspot (see CSS / JSX below), so the pointer
            // position IS the heart's centre / the glove's fingertip; the trail is anchored at the
            // visible centre of whichever shape is showing (see ANCHOR_*).
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
            window.removeEventListener('resize', setupCanvas);
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
                <canvas
                    ref={trailRef}
                    aria-hidden="true"
                    className="custom-cursor-trail"
                    style={{ width: TRAIL_BOX, height: TRAIL_BOX }}
                />
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
