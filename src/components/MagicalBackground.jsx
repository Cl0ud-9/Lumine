import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useFloatingElements } from '../hooks/useFloatingElements';
import FloatingParticles from './FloatingParticles';

const MagicalBackground = () => {
    const elements = useFloatingElements({ heartCount: 15, sparkleCount: 12 });

    const [isMobile, setIsMobile] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);
        const motionHandler = () => setPrefersReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener('change', motionHandler);

        const handleMouseMove = (e) => {
            if (isMobile || prefersReducedMotion) return;
            const { innerWidth, innerHeight } = window;
            x.set((e.clientX / innerWidth) - 0.5);
            y.set((e.clientY / innerHeight) - 0.5);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', checkMobile);
            mediaQuery.removeEventListener('change', motionHandler);
        };
    }, [isMobile, prefersReducedMotion, x, y]);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-surface">
            {/* Floating Elements with Parallax */}
            <motion.div
                style={{ x: layer1X, y: layer1Y }}
                className="absolute inset-[-5%]" // slightly larger to prevent edge clipping
            >
                <FloatingParticles elements={elements} prefersReducedMotion={prefersReducedMotion} heartVariant="outline" />
            </motion.div>

            {/* Subtle Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        </div>
    );
};

export default MagicalBackground;
