import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import gsap from 'gsap';
import heartCursor from '../assets/cursors/heart-cursor.png';
import pointerCursor from '../assets/cursors/pointer-cursor.png';

const CustomCursor = () => {
    const [isTouch, setIsTouch] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);
    const [isHovering, setIsHovering] = useState(false);
    const svgRef = useRef(null);

    useEffect(() => {
        const checkTouch = () => {
            setIsTouch(window.matchMedia("(pointer: coarse)").matches);
        };
        checkTouch();
        window.addEventListener('resize', checkTouch);

        // GSAP Trail Logic
        const total = 50;
        const ease = 0.5;
        // Start pointer off-screen or center, but we'll control visibility with a flag
        let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const lines = [];
        let hasMoved = false; // Flag to track first movement

        const createLine = (leader, i) => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            svgRef.current.appendChild(line);

            // PINK GRADIENT LOGIC
            // Start (near cursor): Hot Pink (#ff5c8d)
            // End (tail): Soft Pink/White (#ffc2d1)
            // Or just a solid pink with opacity fade. Let's do a nice gradient.
            const hue = 340; // Pinkish
            const sat = 100;
            const light = 60 + (i / total) * 30; // 60% -> 90% Lightness
            const color = `hsl(${hue}, ${sat}%, ${light}%)`;

            gsap.set(line, {
                x: -15, y: -15,
                alpha: 0, // Start invisible
                attr: { stroke: color, "stroke-width": 2 } // Set stroke color here
            });


            const pos = { x: 0, y: 0 }; // Local position storage for the line

            gsap.to(line, {
                duration: 1000,
                x: "+=1",
                y: "+=1",
                repeat: -1,
                modifiers: {
                    x: function () {
                        const posX = pos.x; // Use local var instead of getProperty for perf? 
                        // Actually, snippet uses getProperty. Let's stick to snippet for reliability.
                        let currentX = gsap.getProperty(line, "x");
                        let leaderX = (i === 0) ? pointer.x : gsap.getProperty(lines[i - 1], "x");

                        var x = currentX + (leaderX - currentX) * ease;
                        line.setAttribute("x2", leaderX - x);
                        return x;
                    },
                    y: function () {
                        let currentY = gsap.getProperty(line, "y");
                        let leaderY = (i === 0) ? pointer.y : gsap.getProperty(lines[i - 1], "y");

                        var y = currentY + (leaderY - currentY) * ease;
                        line.setAttribute("y2", leaderY - y);
                        return y;
                    }
                }
            });

            return line;
        };


        const onMouseMove = (e) => {
            const x = e.clientX;
            const y = e.clientY;
            // Offset trail slightly to bottom right for better alignment with heart cursor
            pointer.x = x + 20;
            pointer.y = y + 18;
            cursorX.set(x);
            cursorY.set(y);

            // Reveal trail on first move
            if (!hasMoved) {
                hasMoved = true;
                // Animate lines to their correct opacity
                lines.forEach((line, i) => {
                    gsap.to(line, { alpha: (total - i) / total, duration: 0.5 });
                });
            }

            // Robust hover check
            try {
                const target = document.elementFromPoint(x, y);
                if (target) {
                    const isClickable = target.matches('button, a, input, select, textarea, [role="button"]') ||
                        target.closest('button, a, [role="button"]');
                    setIsHovering(!!isClickable);
                } else {
                    setIsHovering(false);
                }
            } catch (err) {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', onMouseMove);

        // Initialize lines
        // Wait for ref to be populated
        if (svgRef.current) {
            // Clean previous
            while (svgRef.current.firstChild) svgRef.current.removeChild(svgRef.current.firstChild);

            let leader = pointer; // Initial leader (not used in loop logic really, just placeholders)
            // The snippet loop logic is slightly different:
            // leader = createLine(leader, i) where `leader` becomes the previous line.
            // But in the modifier, it references `leader`.
            // My implementation above: `leaderX` logic inside modifier handles the chaining.

            for (let i = 0; i < total; i++) {
                lines.push(createLine(null, i)); // null leader, logic handled in modifier
            }
        }


        return () => {
            window.removeEventListener('resize', checkTouch);
            window.removeEventListener('mousemove', onMouseMove);
            gsap.globalTimeline.clear(); // Clear all GSAP animations
            if (svgRef.current) {
                while (svgRef.current.firstChild) svgRef.current.removeChild(svgRef.current.firstChild);
            }
        };
    }, []); // Empty dep array once

    if (isTouch) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Lines injected by GSAP */}
            </svg>

            {/* Main Cursor - Rendered LAST to be ON TOP */}
            <motion.div
                style={{
                    translateX: cursorX,
                    translateY: cursorY,
                    x: "0%",
                    y: "0%"
                }}
                className="fixed top-0 left-0 will-change-transform z-50"
            >
                {/* Scale animation when switching */}
                <motion.div
                    initial={false}
                    animate={{
                        scale: isHovering ? 1.1 : 1,
                        rotate: isHovering ? 0 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    // Softened Vibrant Pink: Brighter and less dark than before
                    style={{ filter: "drop-shadow(0 2px 5px rgba(255, 92, 141, 0.4)) brightness(1.2) saturate(2.8) hue-rotate(-5deg)" }}
                >
                    {isHovering ? (
                        // HOVER STATE: HEART CURSOR (Animated Pulse)
                        // Heart centered horizontally, bottom tip at cursor position
                        <motion.img
                            src={heartCursor}
                            alt="cursor"
                            className="w-10 h-10 object-contain -translate-x-1/2 -translate-y-full"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        />
                    ) : (
                        // DEFAULT STATE: POINTER CURSOR
                        // Pointer tip at top-left corner aligns with cursor position
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
